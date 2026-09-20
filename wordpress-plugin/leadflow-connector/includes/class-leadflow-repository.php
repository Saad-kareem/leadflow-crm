<?php
/**
 * Storage for submitted leads.
 *
 * Leads are kept in a dedicated table rather than a custom post type. The
 * reasoning is in the project README, but briefly: a lead is a record, not
 * content. It is never rendered on the front end, never needs revisions, the
 * block editor or taxonomies, and it carries six fields that would otherwise
 * become six `postmeta` rows each. The admin screen's common questions —
 * "which syncs failed?", "newest first" — are an indexed column scan here and
 * a join-heavy `meta_query` as a CPT.
 *
 * Every method in this class is the only place raw SQL is written, and every
 * value goes through `$wpdb->prepare()` or the typed format arrays that
 * `insert()`/`update()` take.
 *
 * @package LeadFlow
 */

defined( 'ABSPATH' ) || exit;

class LeadFlow_Repository {

	const DB_VERSION = '1.0.0';

	const STATUS_PENDING   = 'pending';
	const STATUS_SYNCED    = 'synced';
	const STATUS_DUPLICATE = 'duplicate';
	const STATUS_FAILED    = 'failed';
	const STATUS_SKIPPED   = 'skipped';

	/**
	 * Fully-qualified table name.
	 *
	 * @return string
	 */
	public static function table() {
		global $wpdb;
		return $wpdb->prefix . 'leadflow_leads';
	}

	/**
	 * Creates or upgrades the table. Safe to call repeatedly — dbDelta only
	 * applies the difference between this definition and what exists.
	 *
	 * @return void
	 */
	public static function install() {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$table           = self::table();
		$charset_collate = $wpdb->get_charset_collate();

		// dbDelta is fussy: two spaces after PRIMARY KEY, one field per line,
		// and KEY names must match exactly on subsequent runs.
		$sql = "CREATE TABLE {$table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			name varchar(120) NOT NULL,
			email varchar(200) NOT NULL,
			phone varchar(40) NOT NULL DEFAULT '',
			service varchar(40) NOT NULL,
			budget varchar(40) NOT NULL,
			message text NOT NULL,
			page_url varchar(500) NOT NULL DEFAULT '',
			ip_address varchar(45) NOT NULL DEFAULT '',
			sync_status varchar(20) NOT NULL DEFAULT 'pending',
			sync_message text NOT NULL,
			sync_attempts smallint(5) unsigned NOT NULL DEFAULT 0,
			crm_lead_id varchar(40) NOT NULL DEFAULT '',
			crm_score smallint(6) DEFAULT NULL,
			synced_at datetime DEFAULT NULL,
			created_at datetime NOT NULL,
			PRIMARY KEY  (id),
			KEY sync_status (sync_status),
			KEY created_at (created_at),
			KEY email (email)
		) {$charset_collate};";

		dbDelta( $sql );

		update_option( 'leadflow_db_version', self::DB_VERSION );
	}

	/**
	 * Stores a validated submission.
	 *
	 * @param array $lead Validated, sanitised fields.
	 * @return int|false Inserted row id, or false on failure.
	 */
	public static function insert( array $lead ) {
		global $wpdb;

		$inserted = $wpdb->insert(
			self::table(),
			array(
				'name'          => $lead['name'],
				'email'         => $lead['email'],
				'phone'         => $lead['phone'],
				'service'       => $lead['service'],
				'budget'        => $lead['budget'],
				'message'       => $lead['message'],
				'page_url'      => $lead['page_url'],
				'ip_address'    => $lead['ip_address'],
				'sync_status'   => self::STATUS_PENDING,
				'sync_message'  => '',
				'sync_attempts' => 0,
				'created_at'    => current_time( 'mysql', true ),
			),
			array( '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%s' )
		);

		return $inserted ? (int) $wpdb->insert_id : false;
	}

	/**
	 * Records the outcome of a sync attempt.
	 *
	 * @param int   $id     Local row id.
	 * @param array $result Result array from LeadFlow_Api_Client.
	 * @return void
	 */
	public static function record_sync_result( $id, array $result ) {
		global $wpdb;

		$row = self::find( $id );
		if ( ! $row ) {
			return;
		}

		$data = array(
			'sync_status'   => $result['status'],
			'sync_message'  => $result['message'],
			'sync_attempts' => (int) $row->sync_attempts + 1,
		);
		$format = array( '%s', '%s', '%d' );

		if ( ! empty( $result['crm_lead_id'] ) ) {
			$data['crm_lead_id'] = $result['crm_lead_id'];
			$format[]            = '%s';
		}

		if ( isset( $result['score'] ) && null !== $result['score'] ) {
			$data['crm_score'] = (int) $result['score'];
			$format[]          = '%d';
		}

		if ( in_array( $result['status'], array( self::STATUS_SYNCED, self::STATUS_DUPLICATE ), true ) ) {
			$data['synced_at'] = current_time( 'mysql', true );
			$format[]          = '%s';
		}

		$wpdb->update( self::table(), $data, array( 'id' => (int) $id ), $format, array( '%d' ) );
	}

	/**
	 * @param int $id Local row id.
	 * @return object|null
	 */
	public static function find( $id ) {
		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- custom table, no core API exists.
		return $wpdb->get_row(
			$wpdb->prepare( 'SELECT * FROM ' . self::table() . ' WHERE id = %d', (int) $id )
		);
	}

	/**
	 * Paginated list for the admin screen.
	 *
	 * @param array $args status, search, per_page, page.
	 * @return array{items: array, total: int}
	 */
	public static function query( array $args = array() ) {
		global $wpdb;

		$args = wp_parse_args(
			$args,
			array(
				'status'   => '',
				'search'   => '',
				'per_page' => 20,
				'page'     => 1,
			)
		);

		$where  = array( '1=1' );
		$params = array();

		if ( $args['status'] ) {
			$where[]  = 'sync_status = %s';
			$params[] = $args['status'];
		}

		if ( $args['search'] ) {
			// esc_like escapes the wildcards, prepare escapes the value.
			$like     = '%' . $wpdb->esc_like( $args['search'] ) . '%';
			$where[]  = '(name LIKE %s OR email LIKE %s OR phone LIKE %s)';
			$params[] = $like;
			$params[] = $like;
			$params[] = $like;
		}

		$clause   = implode( ' AND ', $where );
		$table    = self::table();
		$per_page = max( 1, (int) $args['per_page'] );
		$offset   = ( max( 1, (int) $args['page'] ) - 1 ) * $per_page;

		$count_sql = "SELECT COUNT(*) FROM {$table} WHERE {$clause}";
		$total     = (int) $wpdb->get_var( $params ? $wpdb->prepare( $count_sql, $params ) : $count_sql );

		$list_sql = "SELECT * FROM {$table} WHERE {$clause} ORDER BY created_at DESC, id DESC LIMIT %d OFFSET %d";
		$items    = $wpdb->get_results( $wpdb->prepare( $list_sql, array_merge( $params, array( $per_page, $offset ) ) ) );

		return array(
			'items' => $items ? $items : array(),
			'total' => $total,
		);
	}

	/**
	 * Counts per sync status, for the filter links above the table.
	 *
	 * @return array<string, int>
	 */
	public static function status_counts() {
		global $wpdb;

		$rows = $wpdb->get_results( 'SELECT sync_status, COUNT(*) AS total FROM ' . self::table() . ' GROUP BY sync_status' );

		$counts = array(
			self::STATUS_PENDING   => 0,
			self::STATUS_SYNCED    => 0,
			self::STATUS_DUPLICATE => 0,
			self::STATUS_FAILED    => 0,
			self::STATUS_SKIPPED   => 0,
		);

		foreach ( (array) $rows as $row ) {
			$counts[ $row->sync_status ] = (int) $row->total;
		}

		return $counts;
	}

	/**
	 * Rows that never reached the CRM, used by "Retry all failed".
	 *
	 * @param int $limit Safety cap so one click cannot fire hundreds of requests.
	 * @return array
	 */
	public static function unsynced( $limit = 25 ) {
		global $wpdb;

		return (array) $wpdb->get_results(
			$wpdb->prepare(
				'SELECT * FROM ' . self::table() . ' WHERE sync_status IN (%s, %s) ORDER BY created_at ASC LIMIT %d',
				self::STATUS_FAILED,
				self::STATUS_PENDING,
				(int) $limit
			)
		);
	}

	/**
	 * Basic flood protection: how many submissions this address has made
	 * recently. Cheap because `created_at` is indexed.
	 *
	 * @param string $ip      Visitor address.
	 * @param int    $minutes Window.
	 * @return int
	 */
	public static function recent_submission_count( $ip, $minutes = 10 ) {
		global $wpdb;

		if ( ! $ip ) {
			return 0;
		}

		return (int) $wpdb->get_var(
			$wpdb->prepare(
				'SELECT COUNT(*) FROM ' . self::table() . ' WHERE ip_address = %s AND created_at > %s',
				$ip,
				gmdate( 'Y-m-d H:i:s', time() - ( (int) $minutes * MINUTE_IN_SECONDS ) )
			)
		);
	}

	/**
	 * Human label for a sync status.
	 *
	 * @param string $status Stored status.
	 * @return string
	 */
	public static function status_label( $status ) {
		$labels = array(
			self::STATUS_PENDING   => __( 'Pending', 'leadflow-connector' ),
			self::STATUS_SYNCED    => __( 'Synced', 'leadflow-connector' ),
			self::STATUS_DUPLICATE => __( 'Duplicate', 'leadflow-connector' ),
			self::STATUS_FAILED    => __( 'Failed', 'leadflow-connector' ),
			self::STATUS_SKIPPED   => __( 'Not sent', 'leadflow-connector' ),
		);

		return isset( $labels[ $status ] ) ? $labels[ $status ] : $status;
	}
}
