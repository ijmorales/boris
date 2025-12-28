import { Calendar } from 'lucide-react';
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import { formatDate, getDateRangePresets } from '~/lib/utils/dates';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onDateRangeChange: (startDate: string, endDate: string) => void;
}

export function DateRangePicker({
  startDate,
  endDate,
  onDateRangeChange,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(startDate);
  const [customEndDate, setCustomEndDate] = useState(endDate);
  const [showCustom, setShowCustom] = useState(false);

  const presets = getDateRangePresets();

  const handlePresetClick = (preset: {
    startDate: string;
    endDate: string;
  }) => {
    onDateRangeChange(preset.startDate, preset.endDate);
    setShowCustom(false);
    setOpen(false);
  };

  const handleCustomApply = () => {
    if (customStartDate && customEndDate) {
      // Validate that start date is before end date
      if (new Date(customStartDate) <= new Date(customEndDate)) {
        onDateRangeChange(customStartDate, customEndDate);
        setShowCustom(false);
        setOpen(false);
      }
    }
  };

  const handleCustomClick = () => {
    setShowCustom(true);
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 bg-transparent">
          <Calendar className="size-4" />
          <span>
            {formatDate(startDate)} - {formatDate(endDate)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardContent className="p-2">
            {!showCustom ? (
              <div className="flex flex-col gap-1">
                {presets.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    className="justify-start"
                    onClick={() => handlePresetClick(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
                <div className="border-t my-1" />
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={handleCustomClick}
                >
                  Custom Range
                </Button>
              </div>
            ) : (
              <div className="p-4 space-y-4 min-w-[280px]">
                <div>
                  <label
                    htmlFor="start-date"
                    className="text-sm font-medium mb-2 block"
                  >
                    Start Date
                  </label>
                  <Input
                    id="start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    max={customEndDate}
                  />
                </div>
                <div>
                  <label
                    htmlFor="end-date"
                    className="text-sm font-medium mb-2 block"
                  >
                    End Date
                  </label>
                  <Input
                    id="end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    min={customStartDate}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustom(false)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCustomApply}
                    className="flex-1"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
