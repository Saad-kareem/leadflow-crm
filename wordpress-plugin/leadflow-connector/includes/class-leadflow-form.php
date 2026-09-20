<?php
/**
 * The `[leadflow_form]` shortcode and its two submission endpoints.
 *
 * The form works without JavaScript: it is an ordinary POST to
 * `admin-post.php`, which redirects back with the result. `leadflow-form.js`
 * then progressively enhances that into an AJAX submit so the page does not
 * reload. Both endpoints verify the same nonce and run the same validation —
 * there is no "easy" path into the database.
 *
 * @package LeadFlow
 */

defined( 'ABSPATH' ) || exit;

class LeadFlow_Form {

	const NONCE_ACTION = 'leadflow_submit_lead';
	const NONCE_FIELD  = 'leadflow_nonce';
	const ACTION       = 'leadflow_submit';

	/**
	 * @return void
	 */
	public static function register() {
		add_shortcode( 'leadflow_form', array( __CLASS__, 'render' ) );

		// Non-JS path.
		add_action( 'admin_post_nopriv_' . self::ACTION, array( __CLASS__, 'handle_post' ) );
		add_action( 'admin_post_' . self::ACTION, array( __CLASS__, 'handle_post' ) );

		// Enhanced path. Both variants are registered because a logged-in
		// editor previewing the page is an `wp_ajax_` request, not `nopriv`.
		add_action( 'wp_ajax_nopriv_' . self::ACTION, array( __CLASS__, 'handle_ajax' ) );
		add_action( 'wp_ajax_' . self::ACTION, array( __CLASS__, 'handle_ajax' ) );

		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'register_assets' ) );
	}

	/**
	 * Registers assets without enqueuing them — the shortcode enqueues on
	 * render, so a page with no form ships no form CSS or JS.
	 *
	 * @return void
	 */
	public static function register_assets() {
		wp_register_style(
			'leadflow-form',
			LEADFLOW_URL . 'assets/css/leadflow-form.css',
			array(),
			LEADFLOW_VERSION
		);

		wp_register_script(
			'leadflow-form',
			LEADFLOW_URL . 'assets/js/leadflow-form.js',
			array(),
			LEADFLOW_VERSION,
			true
		);
	}

	/**
	 * Renders the form.
	 *
	 * @param array $atts Shortcode attributes.
	 * @return string
	 */
	public static function render( $atts = array() ) {
		$atts = shortcode_atts(
			array(
				'title'       => __( 'Start a project with us', 'leadflow-connector' ),
				'description' => __( 'Tell us what you need and we will come back to you within one working day.', 'leadflow-connector' ),
				'button'      => __( 'Send enquiry', 'leadflow-connector' ),
			),
			$atts,
			'leadflow_form'
		);

		wp_enqueue_style( 'leadflow-form' );
		wp_enqueue_script( 'leadflow-form' );
		wp_localize_script(
			'leadflow-form',
			'leadflowForm',
			array(
				'ajaxUrl' => admin_url( 'admin-ajax.php' ),
				'action'  => self::ACTION,
				'strings' => array(
					'sending' => __( 'Sending…', 'leadflow-connector' ),
					'network' => __( 'We could not send your enquiry just now. Please try again.', 'leadflow-connector' ),
				),
			)
		);

		$result = self::consume_result();
		$values = $result && ! empty( $result['values'] ) ? $result['values'] : array();
		$errors = $result && ! empty( $result['errors'] ) ? $result['errors'] : array();

		ob_start();
		include LEADFLOW_PATH . 'templates/form.php';

		return ob_get_clean();
	}

	/**
	 * Handles a plain form POST and redirects back to the page.
	 *
	 * Redirecting rather than rendering means a refresh cannot re-submit the
	 * form, and the result travels in a short-lived transient rather than in
	 * the URL, so nothing the visitor typed ends up in server logs.
	 *
	 * @return void
	 */
	public static function handle_post() {
		$referer = wp_get_referer() ? wp_get_referer() : home_url( '/' );

		if ( ! isset( $_POST[ self::NONCE_FIELD ] ) ||
			! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST[ self::NONCE_FIELD ] ) ), self::NONCE_ACTION ) ) {
			wp_safe_redirect( self::result_url( $referer, self::store_result( array(
				'ok'      => false,
				'message' => __( 'Your session expired. Please reload the page and try again.', 'leadflow-connector' ),
				'errors'  => array(),
			) ) ) );
			exit;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- verified above.
		$result = LeadFlow_Submission::process( $_POST );

		if ( ! $result['ok'] ) {
			// Give the visitor their answers back rather than an empty form.
			// phpcs:ignore WordPress.Security.NonceVerification.Missing -- verified above.
			$result['values'] = self::submitted_values( $_POST );
		}

		wp_safe_redirect( self::result_url( $referer, self::store_result( $result ) ) );
		exit;
	}

	/**
	 * Handles the enhanced AJAX submit.
	 *
	 * @return void
	 */
	public static function handle_ajax() {
		// `false` so an expired nonce returns JSON the script can display,
		// rather than the -1 body that would surface as a generic failure.
		if ( ! check_ajax_referer( self::NONCE_ACTION, self::NONCE_FIELD, false ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'Your session expired. Please reload the page and try again.', 'leadflow-connector' ),
					'errors'  => array(),
				),
				403
			);
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- verified above.
		$result = LeadFlow_Submission::process( $_POST );

		if ( ! $result['ok'] ) {
			wp_send_json_error(
				array(
					'message' => $result['message'],
					'errors'  => $result['errors'],
				),
				422
			);
		}

		wp_send_json_success( array( 'message' => $result['message'] ) );
	}

	/**
	 * Stores a submission result for one page load.
	 *
	 * @param array $result Result payload.
	 * @return string Token identifying the stored result.
	 */
	private static function store_result( array $result ) {
		$token = wp_generate_password( 20, false, false );
		set_transient( 'leadflow_result_' . $token, $result, 2 * MINUTE_IN_SECONDS );

		return $token;
	}

	/**
	 * Reads and deletes the result for the current request, so a refresh does
	 * not show the same message twice.
	 *
	 * @return array|null
	 */
	private static function consume_result() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only lookup of an opaque token.
		if ( empty( $_GET['leadflow'] ) ) {
			return null;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$token  = sanitize_key( wp_unslash( $_GET['leadflow'] ) );
		$result = get_transient( 'leadflow_result_' . $token );

		if ( ! $result ) {
			return null;
		}

		delete_transient( 'leadflow_result_' . $token );

		return is_array( $result ) ? $result : null;
	}

	/**
	 * @param string $referer Page the form was submitted from.
	 * @param string $token   Result token.
	 * @return string
	 */
	private static function result_url( $referer, $token ) {
		return add_query_arg( 'leadflow', $token, remove_query_arg( 'leadflow', $referer ) ) . '#leadflow-form';
	}

	/**
	 * Sanitised copies of what the visitor typed, for re-populating the form.
	 *
	 * @param array $raw Raw POST data.
	 * @return array
	 */
	private static function submitted_values( array $raw ) {
		$keys   = array( 'leadflow_name', 'leadflow_email', 'leadflow_phone', 'leadflow_service', 'leadflow_budget', 'leadflow_message' );
		$values = array();

		foreach ( $keys as $key ) {
			if ( ! isset( $raw[ $key ] ) ) {
				continue;
			}
			$values[ $key ] = 'leadflow_message' === $key
				? sanitize_textarea_field( wp_unslash( $raw[ $key ] ) )
				: sanitize_text_field( wp_unslash( $raw[ $key ] ) );
		}

		return $values;
	}
}
