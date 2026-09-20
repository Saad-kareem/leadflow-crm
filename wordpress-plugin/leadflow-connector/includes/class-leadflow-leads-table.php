<?php
/**
 * The wp-admin leads table.
 *
 * Built on WP_List_Table so it inherits the search box, pagination, status
 * filters and keyboard behaviour that admins already know from Posts — rather
 * than re-implementing all of it, worse, in a hand-rolled table.
 *
 * @package LeadFlow
 */

defined( 'ABSPATH' ) || exit;

if ( ! class_exists( 'WP_List_Table' ) ) {
	require_once ABSPATH . 'wp-admin/includes/class-wp-list-table.php';
}

class LeadFlow_Leads_Table extends WP_List_Table {

	/** @var array<string, int> */
	private $counts = array();

	public function __construct() {
		parent::__construct(
			array(
				'singular' => 'lead',
				'plural'   => 'leads',
				'ajax'     => false,
			)
		);
	}

	/**
	 * @return array<string, string>
	 */
	public function get_columns() {
		return array(
			'lead'        => __( 'Lead', 'leadflow-connector' ),
			'service'     => __( 'Service', 'leadflow-connector' ),
			'budget'      => __( 'Budget', 'leadflow-connector' ),
			'score'       => __( 'Lead Score', 'leadflow-connector' ),
			'sync_status' => __( 'CRM Sync', 'leadflow-connector' ),
			'created_at'  => __( 'Submitted', 'leadflow-connector' ),
		);
	}

	/**
	 * Loads the current page of rows.
	 *
	 * @return void
	 */
	public function prepare_items() {
		$per_page = 20;

		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- read-only list filters.
		$status = isset( $_GET['sync_status'] ) ? sanitize_key( wp_unslash( $_GET['sync_status'] ) ) : '';
		$search = isset( $_REQUEST['s'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['s'] ) ) : '';
		// phpcs:enable

		$result = LeadFlow_Repository::query(
			array(
				'status'   => $status,
				'search'   => $search,
				'per_page' => $per_page,
				'page'     => $this->get_pagenum(),
			)
		);

		$this->counts                = LeadFlow_Repository::status_counts();
		$this->items                 = $result['items'];
		$this->_column_headers       = array( $this->get_columns(), array(), array() );

		$this->set_pagination_args(
			array(
				'total_items' => $result['total'],
				'per_page'    => $per_page,
				'total_pages' => (int) ceil( $result['total'] / $per_page ),
			)
		);
	}

	/**
	 * The "All | Synced | Failed" links above the table.
	 *
	 * @return array<string, string>
	 */
	protected function get_views() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$current = isset( $_GET['sync_status'] ) ? sanitize_key( wp_unslash( $_GET['sync_status'] ) ) : '';
		$base    = admin_url( 'admin.php?page=leadflow-leads' );
		$total   = array_sum( $this->counts );

		$views = array(
			'all' => sprintf(
				'<a href="%s"%s>%s <span class="count">(%d)</span></a>',
				esc_url( $base ),
				'' === $current ? ' class="current"' : '',
				esc_html__( 'All', 'leadflow-connector' ),
				$total
			),
		);

		foreach ( $this->counts as $status => $count ) {
			if ( ! $count ) {
				continue;
			}

			$views[ $status ] = sprintf(
				'<a href="%s"%s>%s <span class="count">(%d)</span></a>',
				esc_url( add_query_arg( 'sync_status', $status, $base ) ),
				$current === $status ? ' class="current"' : '',
				esc_html( LeadFlow_Repository::status_label( $status ) ),
				$count
			);
		}

		return $views;
	}

	/**
	 * Name, email and phone in one cell, with the row actions underneath —
	 * the same shape as the Posts title column.
	 *
	 * @param object $item Lead row.
	 * @return string
	 */
	public function column_lead( $item ) {
		$actions = array();

		if ( ! in_array( $item->sync_status, array( LeadFlow_Repository::STATUS_SYNCED, LeadFlow_Repository::STATUS_DUPLICATE ), true ) ) {
			$actions['retry'] = sprintf(
				'<a href="%s">%s</a>',
				esc_url( LeadFlow_Admin::retry_url( (int) $item->id ) ),
				esc_html__( 'Retry sync', 'leadflow-connector' )
			);
		}

		$actions['email'] = sprintf(
			'<a href="mailto:%s">%s</a>',
			esc_attr( $item->email ),
			esc_html__( 'Email', 'leadflow-connector' )
		);

		$secondary = $item->phone
			? sprintf( '%s &middot; %s', esc_html( $item->email ), esc_html( $item->phone ) )
			: esc_html( $item->email );

		return sprintf(
			'<strong>%s</strong><br /><span class="description">%s</span>%s',
			esc_html( $item->name ),
			$secondary,
			$this->row_actions( $actions )
		);
	}

	/**
	 * @param object $item Lead row.
	 * @return string
	 */
	public function column_service( $item ) {
		return esc_html( LeadFlow_Fields::label( LeadFlow_Fields::services(), $item->service ) );
	}

	/**
	 * @param object $item Lead row.
	 * @return string
	 */
	public function column_budget( $item ) {
		return esc_html( LeadFlow_Fields::label( LeadFlow_Fields::budgets(), $item->budget ) );
	}

	/**
	 * The score is calculated by the API, so it is only known once a lead has
	 * synced. An em dash is more honest here than a zero.
	 *
	 * @param object $item Lead row.
	 * @return string
	 */
	public function column_score( $item ) {
		if ( null === $item->crm_score || '' === $item->crm_score ) {
			return '<span class="leadflow-muted">&mdash;</span>';
		}

		return sprintf(
			'<span class="leadflow-score"><strong>%d</strong><span class="leadflow-muted"> / 100</span></span>',
			(int) $item->crm_score
		);
	}

	/**
	 * @param object $item Lead row.
	 * @return string
	 */
	public function column_sync_status( $item ) {
		$detail = $item->sync_message
			? sprintf( '<br /><span class="description">%s</span>', esc_html( $item->sync_message ) )
			: '';

		return sprintf(
			'<span class="leadflow-pill leadflow-pill--%s">%s</span>%s',
			esc_attr( $item->sync_status ),
			esc_html( LeadFlow_Repository::status_label( $item->sync_status ) ),
			$detail
		);
	}

	/**
	 * @param object $item Lead row.
	 * @return string
	 */
	public function column_created_at( $item ) {
		// Stored in UTC; rendered in the site's timezone.
		$timestamp = strtotime( $item->created_at . ' UTC' );

		return sprintf(
			'%s<br /><span class="description">%s</span>',
			esc_html( wp_date( get_option( 'date_format' ), $timestamp ) ),
			esc_html( wp_date( get_option( 'time_format' ), $timestamp ) )
		);
	}

	/**
	 * @return void
	 */
	public function no_items() {
		esc_html_e( 'No leads yet. Add the [leadflow_form] shortcode to a page to start collecting them.', 'leadflow-connector' );
	}
}
