export default function LoadingSpinner() {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="spinner" role="status" aria-label="Loading" />
        <p className="loading-text">Loading...</p>
      </div>
    </div>
  );
}
