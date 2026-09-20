<?php
/**
 * wp-admin screens: the leads list, the settings page, and the actions that
 * hang off them.
 *
 * Every action here checks a capability *and* a nonce. The capability answers
 * "is this person allowed to do it", the nonce answers "did they mean to" —
 * they are not interchangeable, and a CSRF works fine against an admin who is
 * allowed to do the thing.
 *
 * @package LeadFlow
 */

defined( 'ABSPATH' ) || exit;

class LeadFlow_Admin {

	const CAPABILITY   = 'manage_options';
	const RETRY_ACTION = 'leadflow_retry_sync';
	const TEST_ACTION  = 'leadflow_test_connection';

	/**
	 * @return void
	 */
	public static function register() {
		add_action( 'admin_menu', array( __CLASS__, 'add_menu' ) );
		add_action( 'admin_init', array( 'LeadFlow_Settings', 'register' ) );
		add_action( 'admin_post_' . self::RETRY_ACTION, array( __CLASS__, 'handle_retry' ) );
		add_action( 'admin_post_' . self::TEST_ACTION, array( __CLASS__, 'handle_test_connection' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( LEADFLOW_FILE ), array( __CLASS__, 'plugin_action_links' ) );
	}

	/**
	 * @return void
	 */
	public static function add_menu() {
		add_menu_page(
			__( 'LeadFlow', 'leadflow-connector' ),
			__( 'LeadFlow', 'leadflow-connector' ),
			self::CAPABILITY,
			'leadflow-leads',
			array( __CLASS__, 'render_leads_page' ),
			'dashicons-groups',
			26
		);

		add_submenu_page(
			'leadflow-leads',
			__( 'Leads', 'leadflow-connector' ),
			__( 'Leads', 'leadflow-connector' ),
			self::CAPABILITY,
			'leadflow-leads',
			array( __CLASS__, 'render_leads_page' )
		);

		add_submenu_page(
			'leadflow-leads',
			__( 'LeadFlow Settings', 'leadflow-connector' ),
			__( 'Settings', 'leadflow-connector' ),
			self::CAPABILITY,
			'leadflow-settings',
			array( __CLASS__, 'render_settings_page' )
		);
	}

	/**
	 * Loads admin styles only on this plugin's own screens.
	 *
	 * @param string $hook Current admin page.
	 * @return void
	 */
	public static function enqueue_assets( $hook ) {
		if ( false === strpos( $hook, 'leadflow' ) ) {
			return;
		}

		wp_enqueue_style(
			'leadflow-admin',
			LEADFLOW_URL . 'assets/css/leadflow-admin.css',
			array(),
			LEADFLOW_VERSION
		);
	}

	/**
	 * Adds a Settings link on the Plugins screen.
	 *
	 * @param array $links Existing links.
	 * @return array
	 */
	public static function plugin_action_links( $links ) {
		array_unshift(
			$links,
			sprintf(
				'<a href="%s">%s</a>',
				esc_url( admin_url( 'admin.php?page=leadflow-settings' ) ),
				esc_html__( 'Settings', 'leadflow-connector' )
			)
		);

		return $links;
	}

	/**
	 * A nonce-signed link for retrying one lead, or every unsynced lead.
	 *
	 * @param int $lead_id Local row id, or 0 for "retry all".
	 * @return string
	 */
	public static function retry_url( $lead_id ) {
		return wp_nonce_url(
			add_query_arg(
				array(
					'action'  => self::RETRY_ACTION,
					'lead_id' => (int) $lead_id,
				),
				admin_url( 'admin-post.php' )
			),
			self::RETRY_ACTION . '_' . (int) $lead_id
		);
	}

	/**
	 * @return void
	 */
	public static function render_leads_page() {
		if ( ! current_user_can( self::CAPABILITY ) ) {
			wp_die( esc_html__( 'You do not have permission to view leads.', 'leadflow-connector' ) );
		}

		require_once LEADFLOW_PATH . 'includes/class-leadflow-leads-table.php';

		$table = new LeadFlow_Leads_Table();
		$table->prepare_items();

		include LEADFLOW_PATH . 'templates/admin-leads.php';
	}

	/**
	 * @return void
	 */
	public static function render_settings_page() {
		if ( ! current_user_can( self::CAPABILITY ) ) {
			wp_die( esc_html__( 'You do not have permission to change these settings.', 'leadflow-connector' ) );
		}

		$settings = LeadFlow_Settings::all();

		include LEADFLOW_PATH . 'templates/admin-settings.php';
	}

	/**
	 * Retries a failed sync.
	 *
	 * @return void
	 */
	public static function handle_retry() {
		$lead_id = isset( $_GET['lead_id'] ) ? (int) $_GET['lead_id'] : 0;

		if ( ! current_user_can( self::CAPABILITY ) ) {
			wp_die( esc_html__( 'You do not have permission to do that.', 'leadflow-connector' ) );
		}

		check_admin_referer( self::RETRY_ACTION . '_' . $lead_id );

		if ( $lead_id > 0 ) {
			$status  = LeadFlow_Submission::sync( $lead_id );
			$notice  = LeadFlow_Repository::STATUS_FAILED === $status ? 'retry-failed' : 'retry-ok';
		} else {
			// "Retry all": capped by the repository so one click cannot fire
			// hundreds of HTTP requests and time the page out.
			$rows    = LeadFlow_Repository::unsynced();
			$succeeded = 0;

			foreach ( $rows as $row ) {
				$status = LeadFlow_Submission::sync( (int) $row->id );
				if ( LeadFlow_Repository::STATUS_FAILED !== $status ) {
					$succeeded++;
				}
			}

			$notice = 0 === count( $rows ) ? 'retry-none' : ( $succeeded ? 'retry-ok' : 'retry-failed' );
		}

		wp_safe_redirect(
			add_query_arg( 'leadflow_notice', $notice, admin_url( 'admin.php?page=leadflow-leads' ) )
		);
		exit;
	}

	/**
	 * Runs the settings page's "Test connection" button.
	 *
	 * @return void
	 */
	public static function handle_test_connection() {
		if ( ! current_user_can( self::CAPABILITY ) ) {
			wp_die( esc_html__( 'You do not have permission to do that.', 'leadflow-connector' ) );
		}

		check_admin_referer( self::TEST_ACTION );

		$result = LeadFlow_Api_Client::test_connection();

		// The message is carried in a transient rather than the URL: it can
		// contain an error string from the HTTP layer, which has no business
		// being in a browser history or an access log.
		set_transient( 'leadflow_test_result', $result, 60 );

		wp_safe_redirect(
			add_query_arg( 'leadflow_notice', 'tested', admin_url( 'admin.php?page=leadflow-settings' ) )
		);
		exit;
	}

	/**
	 * Renders the notice for whatever action just ran.
	 *
	 * @return void
	 */
	public static function render_notice() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- display only; the action itself was nonce-checked.
		$notice = isset( $_GET['leadflow_notice'] ) ? sanitize_key( wp_unslash( $_GET['leadflow_notice'] ) ) : '';

		if ( ! $notice ) {
			return;
		}

		if ( 'tested' === $notice ) {
			$result = get_transient( 'leadflow_test_result' );
			delete_transient( 'leadflow_test_result' );

			if ( ! $result ) {
				return;
			}

			printf(
				'<div class="notice notice-%s is-dismissible"><p>%s</p></div>',
				esc_attr( $result['ok'] ? 'success' : 'error' ),
				esc_html( $result['message'] )
			);

			return;
		}

		$messages = array(
			'retry-ok'     => array( 'success', __( 'Sync retried.', 'leadflow-connector' ) ),
			'retry-failed' => array( 'error', __( 'The retry did not succeed. Check the sync message on the lead, and the settings page.', 'leadflow-connector' ) ),
			'retry-none'   => array( 'info', __( 'There was nothing waiting to be synced.', 'leadflow-connector' ) ),
		);

		if ( ! isset( $messages[ $notice ] ) ) {
			return;
		}

		printf(
			'<div class="notice notice-%s is-dismissible"><p>%s</p></div>',
			esc_attr( $messages[ $notice ][0] ),
			esc_html( $messages[ $notice ][1] )
		);
	}
}
