<?php
/**
 * wp-admin: LeadFlow settings.
 *
 * @package LeadFlow
 *
 * @var array $settings Current settings.
 */

defined( 'ABSPATH' ) || exit;

$leadflow_has_token = '' !== $settings['api_token'];
?>
<div class="wrap leadflow-admin">
	<h1><?php esc_html_e( 'LeadFlow Settings', 'leadflow-connector' ); ?></h1>

	<?php LeadFlow_Admin::render_notice(); ?>
	<?php settings_errors( LeadFlow_Settings::OPTION ); ?>

	<form method="post" action="<?php echo esc_url( admin_url( 'options.php' ) ); ?>">
		<?php settings_fields( 'leadflow_settings_group' ); ?>

		<table class="form-table" role="presentation">
			<tbody>
				<tr>
					<th scope="row">
						<label for="leadflow_api_url"><?php esc_html_e( 'CRM API URL', 'leadflow-connector' ); ?></label>
					</th>
					<td>
						<input
							type="url"
							class="regular-text code"
							id="leadflow_api_url"
							name="<?php echo esc_attr( LeadFlow_Settings::OPTION ); ?>[api_url]"
							value="<?php echo esc_attr( $settings['api_url'] ); ?>"
							placeholder="http://localhost:4000"
						/>
						<p class="description">
							<?php esc_html_e( 'The base URL only — no trailing slash and no path. Endpoints are appended automatically.', 'leadflow-connector' ); ?>
						</p>
					</td>
				</tr>

				<tr>
					<th scope="row">
						<label for="leadflow_api_token"><?php esc_html_e( 'API token', 'leadflow-connector' ); ?></label>
					</th>
					<td>
						<?php
						// The stored token is never printed back into the page.
						// Leaving the field blank keeps the existing value, so
						// an admin can change the URL without handling the
						// secret at all.
						?>
						<input
							type="password"
							class="regular-text code"
							id="leadflow_api_token"
							name="<?php echo esc_attr( LeadFlow_Settings::OPTION ); ?>[api_token]"
							value=""
							autocomplete="new-password"
							placeholder="<?php echo $leadflow_has_token
								? esc_attr__( 'A token is saved — leave blank to keep it', 'leadflow-connector' )
								: esc_attr__( 'Paste the WP_SYNC_TOKEN value', 'leadflow-connector' ); ?>"
						/>
						<p class="description">
							<?php esc_html_e( 'Must match WP_SYNC_TOKEN in the API\'s .env file. It is sent as the X-LeadFlow-Token header and is never shown again after saving.', 'leadflow-connector' ); ?>
						</p>
					</td>
				</tr>

				<tr>
					<th scope="row"><?php esc_html_e( 'Sync', 'leadflow-connector' ); ?></th>
					<td>
						<fieldset>
							<legend class="screen-reader-text">
								<?php esc_html_e( 'Send new leads to the CRM', 'leadflow-connector' ); ?>
							</legend>
							<label for="leadflow_sync_enabled">
								<input
									type="checkbox"
									id="leadflow_sync_enabled"
									name="<?php echo esc_attr( LeadFlow_Settings::OPTION ); ?>[sync_enabled]"
									value="1"
									<?php checked( 1, (int) $settings['sync_enabled'] ); ?>
								/>
								<?php esc_html_e( 'Send new leads to the CRM', 'leadflow-connector' ); ?>
							</label>
							<p class="description">
								<?php esc_html_e( 'When this is off, submissions are still saved in WordPress and can be synced later.', 'leadflow-connector' ); ?>
							</p>
						</fieldset>
					</td>
				</tr>

				<tr>
					<th scope="row">
						<label for="leadflow_success_message"><?php esc_html_e( 'Thank-you message', 'leadflow-connector' ); ?></label>
					</th>
					<td>
						<input
							type="text"
							class="large-text"
							id="leadflow_success_message"
							name="<?php echo esc_attr( LeadFlow_Settings::OPTION ); ?>[success_message]"
							value="<?php echo esc_attr( $settings['success_message'] ); ?>"
						/>
						<p class="description">
							<?php esc_html_e( 'Shown to the visitor once the form has been submitted.', 'leadflow-connector' ); ?>
						</p>
					</td>
				</tr>
			</tbody>
		</table>

		<?php submit_button(); ?>
	</form>

	<hr />

	<h2><?php esc_html_e( 'Connection', 'leadflow-connector' ); ?></h2>
	<p class="description">
		<?php esc_html_e( 'Checks the URL and token against the API before a real lead depends on them.', 'leadflow-connector' ); ?>
	</p>

	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
		<input type="hidden" name="action" value="<?php echo esc_attr( LeadFlow_Admin::TEST_ACTION ); ?>" />
		<?php wp_nonce_field( LeadFlow_Admin::TEST_ACTION ); ?>
		<?php submit_button( __( 'Test connection', 'leadflow-connector' ), 'secondary', 'submit', false ); ?>
	</form>

	<hr />

	<h2><?php esc_html_e( 'Adding the form', 'leadflow-connector' ); ?></h2>
	<p>
		<?php esc_html_e( 'Place this shortcode on any page or post:', 'leadflow-connector' ); ?>
		<code>[leadflow_form]</code>
	</p>
	<p class="description">
		<?php esc_html_e( 'The heading, description and button text can be overridden:', 'leadflow-connector' ); ?>
		<code>[leadflow_form title="Work with us" button="Request a quote"]</code>
	</p>
</div>
