<?php
/**
 * Removes the plugin's own data when it is deleted from wp-admin.
 *
 * Deactivating leaves everything alone — only an explicit delete clears up,
 * which is what an admin expects from either action.
 *
 * @package LeadFlow
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

global $wpdb;

$leadflow_table = $wpdb->prefix . 'leadflow_leads';

// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL -- table name is built from the prefix, not from input.
$wpdb->query( "DROP TABLE IF EXISTS {$leadflow_table}" );

delete_option( 'leadflow_settings' );
delete_option( 'leadflow_db_version' );
