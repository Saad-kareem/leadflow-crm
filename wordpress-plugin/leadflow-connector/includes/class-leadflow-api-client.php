<?php
/**
 * Talks to the LeadFlow CRM API.
 *
 * Everything here returns a result array rather than throwing, because the
 * caller's job is to record the outcome against the local row — a failed sync
 * must never turn into a failed submission for the visitor.
 *
 * @package LeadFlow
 */

defined( 'ABSPATH' ) || exit;

class LeadFlow_Api_Client {

	/** Short enough that a slow CRM cannot hold up a page load. */
	const TIMEOUT = 8;

	/**
	 * Sends a lead to the CRM.
	 *
	 * @param object $row Row from the local table.
	 * @return array{status: string, message: string, crm_lead_id: string, score: ?int}
	 */
	public static function sync_lead( $row ) {
		if ( ! LeadFlow_Settings::is_sync_ready() ) {
			return self::result(
				LeadFlow_Repository::STATUS_SKIPPED,
				__( 'CRM sync is switched off or not configured.', 'leadflow-connector' )
			);
		}

		$response = self::request(
			'POST',
			'/api/integrations/wordpress/leads',
			array(
				'name'        => $row->name,
				'email'       => $row->email,
				'phone'       => $row->phone,
				'service'     => $row->service,
				'budget'      => $row->budget,
				'message'     => $row->message,
				'wordpressId' => (int) $row->id,
				'siteUrl'     => home_url(),
				'pageUrl'     => $row->page_url,
				// Sent so a lead that syncs late still sorts by when the
				// visitor actually submitted it. MySQL datetimes are stored in
				// UTC here, and the `Z` form is used rather than gmdate('c')'s
				// `+00:00` so the timestamp is unambiguous to any consumer.
				'submittedAt' => gmdate( 'Y-m-d\TH:i:s\Z', strtotime( $row->created_at . ' UTC' ) ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return self::result( LeadFlow_Repository::STATUS_FAILED, $response->get_error_message() );
		}

		$code = (int) wp_remote_retrieve_response_code( $response );
		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( $code >= 200 && $code < 300 && ! empty( $body['success'] ) ) {
			$data      = isset( $body['data'] ) ? $body['data'] : array();
			$duplicate = ! empty( $data['duplicate'] );

			return self::result(
				$duplicate ? LeadFlow_Repository::STATUS_DUPLICATE : LeadFlow_Repository::STATUS_SYNCED,
				$duplicate
					? __( 'The CRM matched this against an existing lead.', 'leadflow-connector' )
					: __( 'Sent to the CRM.', 'leadflow-connector' ),
				isset( $data['leadId'] ) ? (string) $data['leadId'] : '',
				isset( $data['score'] ) ? (int) $data['score'] : null
			);
		}

		return self::result( LeadFlow_Repository::STATUS_FAILED, self::describe_failure( $code, $body ) );
	}

	/**
	 * Checks credentials for the "Test connection" button.
	 *
	 * @return array{ok: bool, message: string}
	 */
	public static function test_connection() {
		if ( ! LeadFlow_Settings::api_url() || ! LeadFlow_Settings::api_token() ) {
			return array(
				'ok'      => false,
				'message' => __( 'Enter the API URL and token first.', 'leadflow-connector' ),
			);
		}

		$response = self::request( 'GET', '/api/integrations/wordpress/ping' );

		if ( is_wp_error( $response ) ) {
			return array(
				'ok'      => false,
				'message' => sprintf(
					/* translators: %s: error detail from WordPress. */
					__( 'Could not reach the API: %s', 'leadflow-connector' ),
					$response->get_error_message()
				),
			);
		}

		$code = (int) wp_remote_retrieve_response_code( $response );

		if ( 200 === $code ) {
			return array( 'ok' => true, 'message' => __( 'Connected. The API accepted this token.', 'leadflow-connector' ) );
		}

		if ( 401 === $code || 403 === $code ) {
			return array( 'ok' => false, 'message' => __( 'The API rejected this token. Check it matches WP_SYNC_TOKEN.', 'leadflow-connector' ) );
		}

		return array(
			'ok'      => false,
			'message' => sprintf(
				/* translators: %d: HTTP status code. */
				__( 'The API responded with status %d.', 'leadflow-connector' ),
				$code
			),
		);
	}

	/**
	 * One place where an HTTP request is made, so the token header and the
	 * timeout cannot drift apart between call sites.
	 *
	 * @param string $method HTTP verb.
	 * @param string $path   Path beginning with a slash.
	 * @param array  $body   Payload for write requests.
	 * @return array|WP_Error
	 */
	private static function request( $method, $path, array $body = array() ) {
		$args = array(
			'method'  => $method,
			'timeout' => self::TIMEOUT,
			'headers' => array(
				'Content-Type'    => 'application/json',
				'Accept'          => 'application/json',
				'X-LeadFlow-Token' => LeadFlow_Settings::api_token(),
			),
		);

		if ( $body ) {
			$args['body'] = wp_json_encode( $body );
		}

		return wp_remote_request( LeadFlow_Settings::api_url() . $path, $args );
	}

	/**
	 * Turns an API error response into something an admin can act on, without
	 * dumping a raw payload into the database.
	 *
	 * @param int   $code HTTP status.
	 * @param mixed $body Decoded response body.
	 * @return string
	 */
	private static function describe_failure( $code, $body ) {
		if ( 401 === $code || 403 === $code ) {
			return __( 'The API rejected the token. Check Settings → LeadFlow.', 'leadflow-connector' );
		}

		if ( 429 === $code ) {
			return __( 'The API is rate limiting this site. The lead is saved here and can be retried.', 'leadflow-connector' );
		}

		if ( 400 === $code && ! empty( $body['errors'] ) && is_array( $body['errors'] ) ) {
			$fields = wp_list_pluck( $body['errors'], 'field' );
			return sprintf(
				/* translators: %s: comma-separated field names. */
				__( 'The API rejected these fields: %s', 'leadflow-connector' ),
				implode( ', ', array_filter( (array) $fields ) )
			);
		}

		if ( ! empty( $body['message'] ) ) {
			return sanitize_text_field( (string) $body['message'] );
		}

		return sprintf(
			/* translators: %d: HTTP status code. */
			__( 'The API responded with status %d.', 'leadflow-connector' ),
			$code
		);
	}

	/**
	 * @param string $status      One of the repository status constants.
	 * @param string $message     Admin-facing explanation.
	 * @param string $crm_lead_id CRM identifier, when known.
	 * @param ?int   $score       Lead score, when known.
	 * @return array
	 */
	private static function result( $status, $message, $crm_lead_id = '', $score = null ) {
		return array(
			'status'      => $status,
			'message'     => $message,
			'crm_lead_id' => $crm_lead_id,
			'score'       => $score,
		);
	}
}
