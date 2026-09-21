import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Compact, self-dismissing Fluent-style notifications used across ICMS ProMax.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-right"
      duration={3200}
      gap={6}
      visibleToasts={4}
      closeButton
      toastOptions={{
        classNames: {
          toast: "plant-toast",
          title: "plant-toast-title",
          description: "plant-toast-desc",
          icon: "plant-toast-icon",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
