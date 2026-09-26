// The outcome of a form or an action: an error, or else a confirmation.
// Screen readers announce it when it appears. Renders nothing when both are
// empty.
function FormMessage({ error, info, className = '' }) {
  if (error) {
    return (
      <p role="alert" className={`text-sm text-danger ${className}`}>
        {error}
      </p>
    );
  }
  if (info) {
    return (
      <p role="status" className={`text-sm text-accent-400 ${className}`}>
        {info}
      </p>
    );
  }
  return null;
}

export default FormMessage;
