<?php
/**
 * Plugin Name:       LeadFlow Connector
 * Plugin URI:        https://github.com/Saad-kareem/leadflow-mini-crm
 * Description:       Publishes a lead capture form with [leadflow_form], stores every submission in WordPress, and syncs it to the LeadFlow CRM API.
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            Saad Karim
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       leadflow-connector
 *
 * @package LeadFlow
 */

defined( 'ABSPATH' ) || exit;

define( 'LEADFLOW_VERSION', '1.0.0' );
define( 'LEADFLOW_FILE', __FILE__ );
define( 'LEADFLOW_PATH', plugin_dir_path( __FILE__ ) );
define( 'LEADFLOW_URL', plugin_dir_url( __FILE__ ) );

require_once LEADFLOW_PATH . 'includes/class-leadflow-settings.php';
require_once LEADFLOW_PATH . 'includes/class-leadflow-repository.php';
require_once LEADFLOW_PATH . 'includes/class-leadflow-fields.php';
require_once LEADFLOW_PATH . 'includes/class-leadflow-api-client.php';
require_once LEADFLOW_PATH . 'includes/class-leadflow-submission.php';
require_once LEADFLOW_PATH . 'includes/class-leadflow-form.php';
require_once LEADFLOW_PATH . 'includes/class-leadflow-admin.php';
require_once LEADFLOW_PATH . 'includes/class-leadflow-plugin.php';

/**
 * Creates the leads table on activation.
 *
 * Registered against the main file rather than inside the bootstrap class so
 * activation still works if the plugin is activated before `plugins_loaded`.
 */
register_activation_hook( __FILE__, array( 'LeadFlow_Repository', 'install' ) );

add_action( 'plugins_loaded', array( 'LeadFlow_Plugin', 'boot' ) );
