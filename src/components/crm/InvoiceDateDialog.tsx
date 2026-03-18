import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectName: string;
  onConfirm: (date: string) => void;
}

const InvoiceDateDialog = ({ open, onOpenChange, prospectName, onConfirm }: Props) => {
  const [date, setDate] = useState<Date>(new Date());

  const handleConfirm = () => {
    onConfirm(format(date, "yyyy-MM-dd"));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Fecha de Facturación</DialogTitle>
          <DialogDescription>
            Selecciona la fecha en que fue facturada la oportunidad <span className="font-semibold text-foreground">"{prospectName}"</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 mt-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP", { locale: es }) : "Seleccionar fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm}>Confirmar Facturación</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDateDialog;
