export function detectDependencies(files: Record<string, any>): Record<string, string> {
  const deps: Record<string, string> = {};
  if (!files) return deps;

  const allCode = Object.values(files)
    .map((f) => (typeof f === 'string' ? f : f?.content || ''))
    .join('\n');
  const filePaths = Object.keys(files);

  const isLocalFileOrFolder = (pkgName: string): boolean => {
    const name = pkgName.startsWith('@/') ? pkgName.substring(2) : pkgName;
    return (
      pkgName.startsWith('@/') ||
      pkgName === '@' ||
      filePaths.some(
        (p) =>
          p === `/${name}` ||
          p.startsWith(`/${name}/`) ||
          p.replace(/\.[^/.]+$/, '') === `/${name}`
      )
    );
  };

  const importRegex = /(?:from|import)\s+['"]([^./][^'"]*)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(allCode)) !== null) {
    const rawImport = match[1];

    // Scoped packages like @scope/package, normal packages like package
    const pkg =
      rawImport.startsWith('@') && !rawImport.startsWith('@/')
        ? rawImport.split('/').slice(0, 2).join('/')
        : rawImport.split('/')[0];

    // Skip react (included in template), react-dom, and local modules
    if (pkg !== 'react' && pkg !== 'react-dom' && !isLocalFileOrFolder(pkg)) {
      deps[pkg] = 'latest';
    }
  }
  return deps;
}
