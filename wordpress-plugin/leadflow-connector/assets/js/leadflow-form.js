/**
 * Progressive enhancement for the LeadFlow form.
 *
 * Without this file the form is an ordinary POST to admin-post.php and works
 * perfectly well. With it, the submit happens in the background so the page
 * does not reload, and required fields are checked before a round trip.
 *
 * Nothing here is a security control — every check is repeated on the server.
 */
(function () {
	'use strict';

	var form = document.querySelector('[data-leadflow-form]');
	if (!form || typeof window.leadflowForm === 'undefined') {
		return;
	}

	var config = window.leadflowForm;
	var notice = document.querySelector('[data-leadflow-notice]');
	var button = form.querySelector('[data-leadflow-submit]');
	var buttonLabel = form.querySelector('[data-leadflow-submit-label]');
	var originalLabel = buttonLabel ? buttonLabel.textContent : '';

	var showNotice = function (message, isSuccess) {
		if (!notice) {
			return;
		}
		notice.textContent = message;
		notice.classList.toggle('is-success', !!isSuccess);
		notice.classList.toggle('is-error', !isSuccess);
		notice.hidden = false;
	};

	var clearErrors = function () {
		form.querySelectorAll('[data-error-for]').forEach(function (element) {
			element.textContent = '';
		});
		form.querySelectorAll('.has-error').forEach(function (element) {
			element.classList.remove('has-error');
			element.removeAttribute('aria-invalid');
		});
	};

	var showErrors = function (errors) {
		var first = null;

		Object.keys(errors || {}).forEach(function (field) {
			var message = form.querySelector('[data-error-for="' + field + '"]');
			var input = form.querySelector('[name="' + field + '"]');

			if (message) {
				message.textContent = errors[field];
			}
			if (input) {
				input.classList.add('has-error');
				input.setAttribute('aria-invalid', 'true');
				first = first || input;
			}
		});

		// Move focus to the first problem rather than leaving the person to
		// hunt for it — especially important on a phone.
		if (first) {
			first.focus();
		}
	};

	var setBusy = function (busy) {
		if (button) {
			button.disabled = busy;
			button.classList.toggle('is-loading', busy);
		}
		if (buttonLabel) {
			buttonLabel.textContent = busy ? config.strings.sending : originalLabel;
		}
	};

	/** Mirrors the server's required-field rules, for instant feedback only. */
	var validate = function (data) {
		var errors = {};
		var name = (data.get('leadflow_name') || '').trim();
		var email = (data.get('leadflow_email') || '').trim();

		if (name.length < 2) {
			errors.leadflow_name = 'Please enter your name.';
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
			errors.leadflow_email = 'Please enter a valid email address.';
		}
		if (!data.get('leadflow_service')) {
			errors.leadflow_service = 'Please choose a service.';
		}
		if (!data.get('leadflow_budget')) {
			errors.leadflow_budget = 'Please choose a budget range.';
		}

		return errors;
	};

	form.addEventListener('submit', function (event) {
		event.preventDefault();
		clearErrors();

		var data = new FormData(form);
		var errors = validate(data);

		if (Object.keys(errors).length) {
			showErrors(errors);
			showNotice('Please check the highlighted fields.', false);
			return;
		}

		data.set('action', config.action);
		setBusy(true);

		window
			.fetch(config.ajaxUrl, {
				method: 'POST',
				body: data,
				credentials: 'same-origin',
			})
			.then(function (response) {
				return response.json().then(function (payload) {
					return { ok: response.ok, payload: payload };
				});
			})
			.then(function (result) {
				var payload = result.payload || {};
				var data = payload.data || {};

				if (payload.success) {
					form.reset();
					form.hidden = true;
					showNotice(data.message, true);
					return;
				}

				showErrors(data.errors);
				showNotice(data.message || config.strings.network, false);
			})
			.catch(function () {
				// A network failure, a proxy error page, anything that is not
				// JSON. The visitor gets one plain sentence, never a stack.
				showNotice(config.strings.network, false);
			})
			.finally(function () {
				setBusy(false);
			});
	});
})();
