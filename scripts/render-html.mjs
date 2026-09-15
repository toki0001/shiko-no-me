// CSS and the entry module ride with HTML so slow revalidation cannot block
// startup separately. Keep the original modules readable and preserve CSS order.
export function buildHTML(template, styles, app) {
  const lf = (text) => text.replace(/\r\n/g, '\n');
  template = lf(template);
  styles = styles.map(lf);
  app = lf(app);
  for (const marker of ['<!-- build:styles -->', '<!-- build:app -->']) {
    if (template.split(marker).length !== 2) throw new Error('Expected one marker: ' + marker);
  }
  if (styles.some((css) => /<\/style\b/i.test(css)) || /<\/script\b/i.test(app)) {
    throw new Error('An inline source contains a closing HTML tag.');
  }
  return template
    .replace(
      '<!-- build:styles -->',
      () => '<style data-build="styles">\n' + styles.join('\n') + '\n</style>',
    )
    .replace(
      '<!-- build:app -->',
      () => '<script type="module" data-build="app">\n' + app + '\n</script>',
    );
}
