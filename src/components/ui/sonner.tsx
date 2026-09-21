import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Minimalist, self-dismissing notifications used across the Plant Desk.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-right"
      duration={2600}
      gap={8}
      visibleToasts={3}
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
