// A short message in place of a page's content, such as "Loading..." or
// "Restaurant not found". tone="error" when loading failed.
function PageMessage({ tone = 'muted', children }) {
  return (
    <main className={`px-4 py-16 text-center md:px-8 ${tone === 'error' ? 'text-danger' : 'text-text-muted'}`}>
      {children}
    </main>
  );
}

export default PageMessage;
