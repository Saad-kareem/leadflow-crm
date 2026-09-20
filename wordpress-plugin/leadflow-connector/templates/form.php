<?php
/**
 * Front-end lead form.
 *
 * Every dynamic value is escaped at the point it is printed. The markup is
 * plain semantic HTML — a fieldset, real labels tied to inputs, and errors
 * referenced with aria-describedby — so it stays usable with a keyboard and a
 * screen reader regardless of the theme's styles.
 *
 * @package LeadFlow
 *
 * @var array $atts   Shortcode attributes.
 * @var array $result Previous submission result, or null.
 * @var array $values Previously submitted values.
 * @var array $errors Field errors keyed by input name.
 */

defined( 'ABSPATH' ) || exit;

$leadflow_value = static function ( $key ) use ( $values ) {
	return isset( $values[ $key ] ) ? $values[ $key ] : '';
};

$leadflow_error = static function ( $key ) use ( $errors ) {
	return isset( $errors[ $key ] ) ? $errors[ $key ] : '';
};

$leadflow_succeeded = $result && ! empty( $result['ok'] );
?>
<section class="leadflow-form" id="leadflow-form">
	<?php if ( $atts['title'] ) : ?>
		<h2 class="leadflow-form__title"><?php echo esc_html( $atts['title'] ); ?></h2>
	<?php endif; ?>

	<?php if ( $atts['description'] ) : ?>
		<p class="leadflow-form__description"><?php echo esc_html( $atts['description'] ); ?></p>
	<?php endif; ?>

	<?php
	// `aria-live` so the script can swap this message in after an AJAX submit
	// and assistive technology announces it without the page reloading.
	?>
	<div
		class="leadflow-form__notice<?php echo $result ? ( $leadflow_succeeded ? ' is-success' : ' is-error' ) : ''; ?>"
		data-leadflow-notice
		role="status"
		aria-live="polite"
		<?php echo $result ? '' : 'hidden'; ?>
	>
		<?php echo $result ? esc_html( $result['message'] ) : ''; ?>
	</div>

	<form
		class="leadflow-form__form"
		method="post"
		action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>"
		data-leadflow-form
		novalidate
		<?php echo $leadflow_succeeded ? 'hidden' : ''; ?>
	>
		<input type="hidden" name="action" value="<?php echo esc_attr( LeadFlow_Form::ACTION ); ?>" />
		<input type="hidden" name="leadflow_page_url" value="<?php echo esc_url( home_url( add_query_arg( array() ) ) ); ?>" />
		<?php wp_nonce_field( LeadFlow_Form::NONCE_ACTION, LeadFlow_Form::NONCE_FIELD ); ?>

		<?php // Honeypot: hidden from people, irresistible to bots. ?>
		<div class="leadflow-form__hp" aria-hidden="true">
			<label for="leadflow_website"><?php esc_html_e( 'Leave this field empty', 'leadflow-connector' ); ?></label>
			<input type="text" id="leadflow_website" name="leadflow_website" tabindex="-1" autocomplete="off" />
		</div>

		<div class="leadflow-form__grid">
			<div class="leadflow-field">
				<label class="leadflow-field__label" for="leadflow_name">
					<?php esc_html_e( 'Full name', 'leadflow-connector' ); ?>
					<span class="leadflow-field__required" aria-hidden="true">*</span>
				</label>
				<input
					class="leadflow-field__input<?php echo $leadflow_error( 'leadflow_name' ) ? ' has-error' : ''; ?>"
					type="text"
					id="leadflow_name"
					name="leadflow_name"
					value="<?php echo esc_attr( $leadflow_value( 'leadflow_name' ) ); ?>"
					placeholder="<?php esc_attr_e( 'Ali Khan', 'leadflow-connector' ); ?>"
					autocomplete="name"
					required
					aria-describedby="leadflow_name_error"
				/>
				<p class="leadflow-field__error" id="leadflow_name_error" data-error-for="leadflow_name">
					<?php echo esc_html( $leadflow_error( 'leadflow_name' ) ); ?>
				</p>
			</div>

			<div class="leadflow-field">
				<label class="leadflow-field__label" for="leadflow_email">
					<?php esc_html_e( 'Email address', 'leadflow-connector' ); ?>
					<span class="leadflow-field__required" aria-hidden="true">*</span>
				</label>
				<input
					class="leadflow-field__input<?php echo $leadflow_error( 'leadflow_email' ) ? ' has-error' : ''; ?>"
					type="email"
					id="leadflow_email"
					name="leadflow_email"
					value="<?php echo esc_attr( $leadflow_value( 'leadflow_email' ) ); ?>"
					placeholder="<?php esc_attr_e( 'ali@company.com', 'leadflow-connector' ); ?>"
					autocomplete="email"
					required
					aria-describedby="leadflow_email_error"
				/>
				<p class="leadflow-field__error" id="leadflow_email_error" data-error-for="leadflow_email">
					<?php echo esc_html( $leadflow_error( 'leadflow_email' ) ); ?>
				</p>
			</div>

			<div class="leadflow-field">
				<label class="leadflow-field__label" for="leadflow_phone">
					<?php esc_html_e( 'Phone number', 'leadflow-connector' ); ?>
					<span class="leadflow-field__optional"><?php esc_html_e( 'optional', 'leadflow-connector' ); ?></span>
				</label>
				<input
					class="leadflow-field__input<?php echo $leadflow_error( 'leadflow_phone' ) ? ' has-error' : ''; ?>"
					type="tel"
					id="leadflow_phone"
					name="leadflow_phone"
					value="<?php echo esc_attr( $leadflow_value( 'leadflow_phone' ) ); ?>"
					placeholder="+92 300 1234567"
					autocomplete="tel"
					aria-describedby="leadflow_phone_error"
				/>
				<p class="leadflow-field__error" id="leadflow_phone_error" data-error-for="leadflow_phone">
					<?php echo esc_html( $leadflow_error( 'leadflow_phone' ) ); ?>
				</p>
			</div>

			<div class="leadflow-field">
				<label class="leadflow-field__label" for="leadflow_service">
					<?php esc_html_e( 'What do you need?', 'leadflow-connector' ); ?>
					<span class="leadflow-field__required" aria-hidden="true">*</span>
				</label>
				<select
					class="leadflow-field__input<?php echo $leadflow_error( 'leadflow_service' ) ? ' has-error' : ''; ?>"
					id="leadflow_service"
					name="leadflow_service"
					required
					aria-describedby="leadflow_service_error"
				>
					<option value=""><?php esc_html_e( 'Choose a service', 'leadflow-connector' ); ?></option>
					<?php foreach ( LeadFlow_Fields::services() as $leadflow_slug => $leadflow_label ) : ?>
						<option
							value="<?php echo esc_attr( $leadflow_slug ); ?>"
							<?php selected( $leadflow_value( 'leadflow_service' ), $leadflow_slug ); ?>
						><?php echo esc_html( $leadflow_label ); ?></option>
					<?php endforeach; ?>
				</select>
				<p class="leadflow-field__error" id="leadflow_service_error" data-error-for="leadflow_service">
					<?php echo esc_html( $leadflow_error( 'leadflow_service' ) ); ?>
				</p>
			</div>

			<div class="leadflow-field leadflow-field--full">
				<label class="leadflow-field__label" for="leadflow_budget">
					<?php esc_html_e( 'Budget range', 'leadflow-connector' ); ?>
					<span class="leadflow-field__required" aria-hidden="true">*</span>
				</label>
				<select
					class="leadflow-field__input<?php echo $leadflow_error( 'leadflow_budget' ) ? ' has-error' : ''; ?>"
					id="leadflow_budget"
					name="leadflow_budget"
					required
					aria-describedby="leadflow_budget_error leadflow_budget_hint"
				>
					<option value=""><?php esc_html_e( 'Choose a range', 'leadflow-connector' ); ?></option>
					<?php foreach ( LeadFlow_Fields::budgets() as $leadflow_slug => $leadflow_label ) : ?>
						<option
							value="<?php echo esc_attr( $leadflow_slug ); ?>"
							<?php selected( $leadflow_value( 'leadflow_budget' ), $leadflow_slug ); ?>
						><?php echo esc_html( $leadflow_label ); ?></option>
					<?php endforeach; ?>
				</select>
				<p class="leadflow-field__hint" id="leadflow_budget_hint">
					<?php esc_html_e( 'A rough range is fine — it helps us suggest the right approach.', 'leadflow-connector' ); ?>
				</p>
				<p class="leadflow-field__error" id="leadflow_budget_error" data-error-for="leadflow_budget">
					<?php echo esc_html( $leadflow_error( 'leadflow_budget' ) ); ?>
				</p>
			</div>

			<div class="leadflow-field leadflow-field--full">
				<label class="leadflow-field__label" for="leadflow_message">
					<?php esc_html_e( 'Tell us about the project', 'leadflow-connector' ); ?>
					<span class="leadflow-field__optional"><?php esc_html_e( 'optional', 'leadflow-connector' ); ?></span>
				</label>
				<textarea
					class="leadflow-field__input leadflow-field__textarea<?php echo $leadflow_error( 'leadflow_message' ) ? ' has-error' : ''; ?>"
					id="leadflow_message"
					name="leadflow_message"
					rows="5"
					placeholder="<?php esc_attr_e( 'What are you building, and when do you need it live?', 'leadflow-connector' ); ?>"
					aria-describedby="leadflow_message_error"
				><?php echo esc_textarea( $leadflow_value( 'leadflow_message' ) ); ?></textarea>
				<p class="leadflow-field__error" id="leadflow_message_error" data-error-for="leadflow_message">
					<?php echo esc_html( $leadflow_error( 'leadflow_message' ) ); ?>
				</p>
			</div>
		</div>

		<div class="leadflow-form__actions">
			<button class="leadflow-button" type="submit" data-leadflow-submit>
				<span data-leadflow-submit-label><?php echo esc_html( $atts['button'] ); ?></span>
			</button>
			<p class="leadflow-form__privacy">
				<?php esc_html_e( 'We only use these details to reply to your enquiry.', 'leadflow-connector' ); ?>
			</p>
		</div>
	</form>
</section>
