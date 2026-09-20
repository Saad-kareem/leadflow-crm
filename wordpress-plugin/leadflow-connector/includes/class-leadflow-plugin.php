<?php
/**
 * Plugin bootstrap.
 *
 * Nothing here does any work itself — it wires the pieces together and keeps
 * that wiring in one readable place.
 *
 * @package LeadFlow
 */

defined( 'ABSPATH' ) || exit;

class LeadFlow_Plugin {

	/**
	 * @return void
	 */
	public static function boot() {
		load_plugin_textdomain( 'leadflow-connector', false, dirname( plugin_basename( LEADFLOW_FILE ) ) . '/languages' );

		LeadFlow_Form::register();

		if ( is_admin() ) {
			LeadFlow_Admin::register();
			add_action( 'admin_init', array( __CLASS__, 'maybe_upgrade_database' ) );
		}
	}

	/**
	 * Runs the table migration after a plugin update.
	 *
	 * The activation hook does not fire when a plugin is updated in place, so
	 * a schema change would otherwise only reach sites that happened to
	 * deactivate and reactivate.
	 *
	 * @return void
	 */
	public static function maybe_upgrade_database() {
		if ( get_option( 'leadflow_db_version' ) === LeadFlow_Repository::DB_VERSION ) {
			return;
		}

		LeadFlow_Repository::install();
	}
}
