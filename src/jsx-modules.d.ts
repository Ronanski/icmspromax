// The plant desk screens were imported as plain JavaScript (.jsx) from the
// previous platform, so TypeScript treats them as untyped modules.
declare module "*.jsx" {
  const component: React.ComponentType<Record<string, unknown>>;
  export default component;
}
