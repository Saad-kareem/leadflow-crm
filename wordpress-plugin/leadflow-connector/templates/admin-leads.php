<?php
/**
 * wp-admin: the leads list.
 *
 * @package LeadFlow
 *
 * @var LeadFlow_Leads_Table $table Prepared list table.
 */

defined( 'ABSPATH' ) || exit;

$leadflow_counts   = LeadFlow_Repository::status_counts();
$leadflow_unsynced = $leadflow_counts[ LeadFlow_Repository::STATUS_FAILED ] + $leadflow_counts[ LeadFlow_Repository::STATUS_PENDING ];
?>
<div class="wrap leadflow-admin">
	<h1 class="wp-heading-inline"><?php esc_html_e( 'LeadFlow Leads', 'leadflow-connector' ); ?></h1>

	<?php if ( $leadflow_unsynced > 0 ) : ?>
		<a href="<?php echo esc_url( LeadFlow_Admin::retry_url( 0 ) ); ?>" class="page-title-action">
			<?php
			printf(
				/* translators: %d: number of leads waiting to sync. */
				esc_html( _n( 'Retry %d unsynced lead', 'Retry %d unsynced leads', $leadflow_unsynced, 'leadflow-connector' ) ),
				(int) $leadflow_unsynced
			);
			?>
		</a>
	<?php endif; ?>

	<hr class="wp-header-end" />

	<?php LeadFlow_Admin::render_notice(); ?>

	<?php if ( ! LeadFlow_Settings::is_sync_ready() ) : ?>
		<div class="notice notice-warning">
			<p>
				<?php esc_html_e( 'CRM sync is off or not configured, so leads are being stored here only.', 'leadflow-connector' ); ?>
				<a href="<?php echo esc_url( admin_url( 'admin.php?page=leadflow-settings' ) ); ?>">
					<?php esc_html_e( 'Open settings', 'leadflow-connector' ); ?>
				</a>
			</p>
		</div>
	<?php endif; ?>

	<p class="description">
		<?php esc_html_e( 'Every submission is saved here first, then sent to the CRM. If a sync fails the lead is still safe — retry it from the row actions.', 'leadflow-connector' ); ?>
	</p>

	<?php $table->views(); ?>

	<form method="get">
		<input type="hidden" name="page" value="leadflow-leads" />
		<?php
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only filter.
		if ( ! empty( $_GET['sync_status'] ) ) :
			?>
			<input
				type="hidden"
				name="sync_status"
				value="<?php echo esc_attr( sanitize_key( wp_unslash( $_GET['sync_status'] ) ) ); ?>"
			/>
		<?php endif; ?>
		<?php $table->search_box( __( 'Search leads', 'leadflow-connector' ), 'leadflow-search' ); ?>
		<?php $table->display(); ?>
	</form>
</div>
