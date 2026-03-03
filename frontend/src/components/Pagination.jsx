export const Pagination = ({ page, hasMore, onPrev, onNext }) => (
    <div className="pagination">
        <button
            className="page-btn"
            onClick={onPrev}
            disabled={page <= 1}
        >
            ← Previous
        </button>
        <span className="page-info">Page {page}</span>
        <button
            className="page-btn"
            onClick={onNext}
            disabled={!hasMore}
        >
            Next →
        </button>
    </div>
);
