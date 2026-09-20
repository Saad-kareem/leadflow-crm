<?php
/**
 * Plugin settings, stored as a single option.
 *
 * The API URL and token are configurable in wp-admin and never hard-coded.
 * They live in one option row rather than four, so reading them is one cached
 * query and adding a setting does not add another row.
 *
 * @package LeadFlow
 */

defined( 'ABSPATH' ) || exit;

class LeadFlow_Settings {

	const OPTION = 'leadflow_settings';

	/**
	 * @return array
	 */
	public static function all() {
		$defaults = array(
			'api_url'       => '',
			'api_token'     => '',
			'sync_enabled'  => 1,
			'success_message' => __( 'Thanks — we have your enquiry and will be in touch shortly.', 'leadflow-connector' ),
		);

		return wp_parse_args( get_option( self::OPTION, array() ), $defaults );
	}

	/**
	 * @param string $key     Setting name.
	 * @param mixed  $default Fallback.
	 * @return mixed
	 */
	public static function get( $key, $default = '' ) {
		$settings = self::all();
		return isset( $settings[ $key ] ) && '' !== $settings[ $key ] ? $settings[ $key ] : $default;
	}

	/**
	 * Base URL with any trailing slash removed, so building endpoints is
	 * simple concatenation wherever it happens.
	 *
	 * @return string
	 */
	public static function api_url() {
		return untrailingslashit( self::get( 'api_url' ) );
	}

	/**
	 * @return string
	 */
	public static function api_token() {
		return (string) self::get( 'api_token' );
	}

	/**
	 * Sync is only attempted when it is switched on *and* configured — this
	 * keeps the form working on a site where the CRM has not been set up yet.
	 *
	 * @return bool
	 */
	public static function is_sync_ready() {
		return (bool) self::get( 'sync_enabled', 0 ) && self::api_url() && self::api_token();
	}

	/**
	 * Registers the option and its sanitiser.
	 *
	 * @return void
	 */
	public static function register() {
		register_setting(
			'leadflow_settings_group',
			self::OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( __CLASS__, 'sanitize' ),
				'default'           => array(),
			)
		);
	}

	/**
	 * Sanitises submitted settings.
	 *
	 * An empty token field leaves the stored token in place, so an admin can
	 * change the URL without having to paste the secret back in — and so the
	 * secret never has to be rendered into the page to survive a save.
	 *
	 * @param mixed $input Raw submitted values.
	 * @return array
	 */
	public static function sanitize( $input ) {
		$existing = self::all();
		$input    = is_array( $input ) ? $input : array();

		$token = isset( $input['api_token'] ) ? trim( sanitize_text_field( $input['api_token'] ) ) : '';

		$clean = array(
			'api_url'         => isset( $input['api_url'] ) ? esc_url_raw( trim( $input['api_url'] ) ) : '',
			'api_token'       => '' !== $token ? $token : $existing['api_token'],
			'sync_enabled'    => empty( $input['sync_enabled'] ) ? 0 : 1,
			'success_message' => isset( $input['success_message'] )
				? sanitize_text_field( $input['success_message'] )
				: $existing['success_message'],
		);

		if ( $clean['api_url'] && ! preg_match( '#^https?://#i', $clean['api_url'] ) ) {
			add_settings_error(
				self::OPTION,
				'leadflow_api_url',
				__( 'The API URL must start with http:// or https://.', 'leadflow-connector' )
			);
			$clean['api_url'] = $existing['api_url'];
		}

		return $clean;
	}
}
