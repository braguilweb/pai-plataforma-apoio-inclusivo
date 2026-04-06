import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

// ============================================================================
// Contexto para composição de Dialog (IME support)
// ============================================================================

type DialogCompositionContextType = {
  isComposing: boolean;
  setComposing: (value: boolean) => void;
  justEndedComposing: () => boolean;
  markCompositionEnd: () => void;
};

const DialogCompositionContext = React.createContext<DialogCompositionContextType | null>(null);

/**
 * Hook para acessar o contexto de composição do Dialog.
 * Usado por componentes como Input para gerenciar IME (input method editor).
 */
export function useDialogComposition() {
  const context = React.useContext(DialogCompositionContext);
  
  // Se não estiver dentro de um Dialog, retorna valores padrão (no-op)
  if (!context) {
    return {
      isComposing: false,
      setComposing: () => {},
      justEndedComposing: () => false,
      markCompositionEnd: () => {},
    };
  }
  
  return context;
}

// ============================================================================
// Provider interno (usado pelo DialogContent)
// ============================================================================

function DialogCompositionProvider({ children }: { children: React.ReactNode }) {
  const [isComposing, setIsComposing] = React.useState(false);
  const justEndedRef = React.useRef(false);
  
  const setComposing = React.useCallback((value: boolean) => {
    setIsComposing(value);
    if (!value) {
      justEndedRef.current = false;
    }
  }, []);
  
  const justEndedComposing = React.useCallback(() => {
    return justEndedRef.current;
  }, []);
  
  const markCompositionEnd = React.useCallback(() => {
    justEndedRef.current = true;
  }, []);
  
  const value = React.useMemo(() => ({
    isComposing,
    setComposing,
    justEndedComposing,
    markCompositionEnd,
  }), [isComposing, setComposing, justEndedComposing, markCompositionEnd]);
  
  return (
    <DialogCompositionContext.Provider value={value}>
      {children}
    </DialogCompositionContext.Provider>
  );
}

// ============================================================================
// Componentes Dialog do shadcn/ui
// ============================================================================

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

// Interface extendida para suportar showCloseButton
interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  showCloseButton?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, showCloseButton = true, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      <DialogCompositionProvider>
        {children}
      </DialogCompositionProvider>
      {showCloseButton && (
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}