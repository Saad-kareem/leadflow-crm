<?php
/**
 * Server-side validation and processing of a form submission.
 *
 * This is the only path a lead can take into the database, whether it arrived
 * through the enhanced JavaScript submit or a plain form POST. The client-side
 * checks in `leadflow-form.js` exist to make the form pleasant, not to make it
 * safe — everything is re-checked here.
 *
 * @package LeadFlow
 */

defined( 'ABSPATH' ) || exit;

class LeadFlow_Submission {

	/** No more than this many submissions from one address in ten minutes. */
	const RATE_LIMIT = 5;

	/**
	 * Validates, stores and (when configured) syncs a submission.
	 *
	 * @param array $raw Unsanitised `$_POST`-shaped input.
	 * @return array{ok: bool, errors: array<string, string>, message: string, lead_id: int, sync_status: string}
	 */
	public static function process( array $raw ) {
		// A hidden field real visitors never see and never fill in. Bots fill
		// every input they find, so a value here means the submission is not
		// worth a database row. It is answered with the ordinary success
		// message rather than an error, so a bot learns nothing.
		if ( ! empty( $raw['leadflow_website'] ) ) {
			return self::success( 0, LeadFlow_Repository::STATUS_SKIPPED );
		}

		$ip = self::client_ip();

		if ( LeadFlow_Repository::recent_submission_count( $ip ) >= self::RATE_LIMIT ) {
			return self::failure(
				array(),
				__( 'You have sent several enquiries already. Please give us a little time to reply.', 'leadflow-connector' )
			);
		}

		list( $lead, $errors ) = self::validate( $raw );

		if ( $errors ) {
			return self::failure( $errors, __( 'Please check the highlighted fields.', 'leadflow-connector' ) );
		}

		$lead['page_url']   = isset( $raw['leadflow_page_url'] ) ? esc_url_raw( wp_unslash( $raw['leadflow_page_url'] ) ) : '';
		$lead['ip_address'] = $ip;

		$lead_id = LeadFlow_Repository::insert( $lead );

		if ( ! $lead_id ) {
			return self::failure(
				array(),
				__( 'We could not save your enquiry. Please try again in a moment.', 'leadflow-connector' )
			);
		}

		/**
		 * Fires once a lead has been stored locally, before it is synced.
		 *
		 * @param int   $lead_id Local row id.
		 * @param array $lead    Sanitised fields.
		 */
		do_action( 'leadflow_lead_saved', $lead_id, $lead );

		$sync_status = self::sync( $lead_id );

		return self::success( $lead_id, $sync_status );
	}

	/**
	 * Runs a sync attempt for a stored row and records the result.
	 *
	 * The visitor's experience never depends on this. Whatever the CRM says,
	 * the lead is already safe in WordPress and visible in wp-admin, which is
	 * the whole reason submissions are stored locally first.
	 *
	 * @param int $lead_id Local row id.
	 * @return string Resulting sync status.
	 */
	public static function sync( $lead_id ) {
		$row = LeadFlow_Repository::find( $lead_id );
		if ( ! $row ) {
			return LeadFlow_Repository::STATUS_FAILED;
		}

		$result = LeadFlow_Api_Client::sync_lead( $row );
		LeadFlow_Repository::record_sync_result( $lead_id, $result );

		return $result['status'];
	}

	/**
	 * Sanitises and validates the submitted fields.
	 *
	 * Sanitising happens first and validation second, so what is checked is
	 * exactly what would be stored — checking the raw value and storing a
	 * sanitised one is how validation gets bypassed.
	 *
	 * @param array $raw Unsanitised input.
	 * @return array{0: array, 1: array<string, string>} Clean fields, then errors keyed by field.
	 */
	private static function validate( array $raw ) {
		$value = static function ( $key ) use ( $raw ) {
			return isset( $raw[ $key ] ) ? wp_unslash( $raw[ $key ] ) : '';
		};

		$lead = array(
			'name'    => sanitize_text_field( $value( 'leadflow_name' ) ),
			'email'   => sanitize_email( $value( 'leadflow_email' ) ),
			'phone'   => sanitize_text_field( $value( 'leadflow_phone' ) ),
			'service' => sanitize_key( $value( 'leadflow_service' ) ),
			'budget'  => sanitize_text_field( $value( 'leadflow_budget' ) ),
			'message' => sanitize_textarea_field( $value( 'leadflow_message' ) ),
		);

		$errors = array();

		if ( mb_strlen( $lead['name'] ) < 2 ) {
			$errors['leadflow_name'] = __( 'Please enter your name.', 'leadflow-connector' );
		} elseif ( mb_strlen( $lead['name'] ) > 120 ) {
			$errors['leadflow_name'] = __( 'That name is too long.', 'leadflow-connector' );
		}

		if ( ! $lead['email'] || ! is_email( $lead['email'] ) ) {
			$errors['leadflow_email'] = __( 'Please enter a valid email address.', 'leadflow-connector' );
		}

		// Optional, but if given it has to look like a phone number.
		if ( $lead['phone'] ) {
			if ( ! preg_match( '/^[+()\-.\s\d]{7,40}$/', $lead['phone'] ) ) {
				$errors['leadflow_phone'] = __( 'Please enter a valid phone number, or leave this blank.', 'leadflow-connector' );
			}
		}

		// Compared against the allow-list rather than merely sanitised, so a
		// crafted request cannot store a service the CRM will later reject.
		if ( ! array_key_exists( $lead['service'], LeadFlow_Fields::services() ) ) {
			$errors['leadflow_service'] = __( 'Please choose a service.', 'leadflow-connector' );
		}

		if ( ! array_key_exists( $lead['budget'], LeadFlow_Fields::budgets() ) ) {
			$errors['leadflow_budget'] = __( 'Please choose a budget range.', 'leadflow-connector' );
		}

		if ( mb_strlen( $lead['message'] ) > 5000 ) {
			$errors['leadflow_message'] = __( 'Please keep your message under 5000 characters.', 'leadflow-connector' );
		}

		return array( $lead, $errors );
	}

	/**
	 * The visitor's address, used only for rate limiting.
	 *
	 * `REMOTE_ADDR` is the only value here that cannot be spoofed by the
	 * client. Proxy headers are deliberately ignored: trusting them would let
	 * anyone bypass the rate limit by inventing an X-Forwarded-For.
	 *
	 * @return string
	 */
	private static function client_ip() {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? wp_unslash( $_SERVER['REMOTE_ADDR'] ) : '';
		$ip = filter_var( $ip, FILTER_VALIDATE_IP );

		return $ip ? $ip : '';
	}

	/**
	 * @param int    $lead_id     Local row id.
	 * @param string $sync_status Outcome of the sync attempt.
	 * @return array
	 */
	private static function success( $lead_id, $sync_status ) {
		return array(
			'ok'          => true,
			'errors'      => array(),
			'message'     => LeadFlow_Settings::get( 'success_message' ),
			'lead_id'     => (int) $lead_id,
			'sync_status' => $sync_status,
		);
	}

	/**
	 * @param array  $errors  Field => message.
	 * @param string $message Summary shown above the form.
	 * @return array
	 */
	private static function failure( array $errors, $message ) {
		return array(
			'ok'          => false,
			'errors'      => $errors,
			'message'     => $message,
			'lead_id'     => 0,
			'sync_status' => '',
		);
	}
}
