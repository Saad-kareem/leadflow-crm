<?php
/**
 * The form's vocabulary.
 *
 * These slugs have to match the enums the CRM API accepts, so they live in one
 * place rather than being repeated in the form markup, the validator and the
 * admin table. The API also publishes the same list at `GET /api/meta`; this
 * copy exists so the form still renders when the CRM is unreachable.
 *
 * @package LeadFlow
 */

defined( 'ABSPATH' ) || exit;

class LeadFlow_Fields {

	/**
	 * Services a visitor can enquire about.
	 *
	 * @return array<string, string> slug => label
	 */
	public static function services() {
		return apply_filters(
			'leadflow_services',
			array(
				'web-development' => __( 'Web Development', 'leadflow-connector' ),
				'ecommerce'       => __( 'E-commerce', 'leadflow-connector' ),
				'seo'             => __( 'SEO', 'leadflow-connector' ),
				'paid-ads'        => __( 'Paid Advertising', 'leadflow-connector' ),
				'branding'        => __( 'Branding & Identity', 'leadflow-connector' ),
				'web-design'      => __( 'Web Design', 'leadflow-connector' ),
				'maintenance'     => __( 'Support & Maintenance', 'leadflow-connector' ),
				'other'           => __( 'Something else', 'leadflow-connector' ),
			)
		);
	}

	/**
	 * Budget ranges.
	 *
	 * @return array<string, string> slug => label
	 */
	public static function budgets() {
		return apply_filters(
			'leadflow_budgets',
			array(
				'under-1k' => __( 'Under $1,000', 'leadflow-connector' ),
				'1k-5k'    => __( '$1,000 – $5,000', 'leadflow-connector' ),
				'5k-15k'   => __( '$5,000 – $15,000', 'leadflow-connector' ),
				'15k-50k'  => __( '$15,000 – $50,000', 'leadflow-connector' ),
				'50k-plus' => __( '$50,000+', 'leadflow-connector' ),
				'not-sure' => __( 'Not sure yet', 'leadflow-connector' ),
			)
		);
	}

	/**
	 * Human label for a stored slug, falling back to the slug itself so an
	 * unknown value from an older submission still renders readably.
	 *
	 * @param array  $choices Slug => label map.
	 * @param string $slug    Stored value.
	 * @return string
	 */
	public static function label( array $choices, $slug ) {
		return isset( $choices[ $slug ] ) ? $choices[ $slug ] : $slug;
	}
}
