export const Loader = () => {
  return (
    <div id="loader">
      <div className="container">
        <div className="progress">
          <div className="progress-bar">
            <div className="shimmer">
              <div></div>
            </div>
          </div>
        </div>
      </div>
      <p className="loader-para">Loading...</p>
    </div>
  );
};
