import { useState } from 'react'

import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group'
import type {User} from '@/services/api';
import { API  } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type BanDialogProps = {
  isOpen: boolean
  selectedUser: User | null
  onSubmit: () => void
  onClose: () => void
}

export default function BanDialog({
  isOpen,
  selectedUser,
  onSubmit,
  onClose,
}: BanDialogProps) {
  const [duration, setDuration] = useState('24') // Default to 1 day
  const [customDuration, setCustomDuration] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [reason, setReason] = useState('')

  const durationPresets = [
    { label: '1 Day', value: '24' },
    { label: '1 Week', value: '168' },
    { label: '1 Month', value: '730' },
    { label: 'Permanent', value: '999999' },
    { label: 'Custom', value: 'custom' },
  ]

  const handleDurationChange = (value: string) => {
    setDuration(value)
    if (value === 'custom') {
      setShowCustomInput(true)
    } else {
      setShowCustomInput(false)
      setCustomDuration('')
    }
  }

  const getFinalDuration = () => {
    if (duration === 'custom') {
      return parseInt(customDuration) || 0
    }
    return parseInt(duration)
  }

  const confirmBan = async () => {
    if (selectedUser) {
      const d = getFinalDuration()
      const result = await API.post('/admin/users/ban', { reason, user_id:selectedUser.id, d })
      if (result.success) {
        toast.success(`User successfully banned`)
      } else {
        toast.error(`Error when banning a user: ${result.error}`)
      }

      setReason('')
      setDuration('24')
      setCustomDuration('')
      setShowCustomInput(false)

      onSubmit()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Ban User</DialogTitle>
          <DialogDescription>
            Are you sure you want to ban {selectedUser?.username}? Please
            provide a reason and select duration.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ban-reason" className="text-right">
              Reason
            </Label>
            <Textarea
              id="ban-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="col-span-3"
              placeholder="Enter ban reason..."
            />
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Duration</Label>
            <div className="col-span-3 space-y-3">
              <ToggleGroup
                type="single"
                variant='outline'
                value={duration}
                onValueChange={handleDurationChange}
                className={`flex flex-row ${!showCustomInput && 'mb-12'} flex-wrap`}
              >
                {durationPresets.map((preset) => (
                  <ToggleGroupItem
                    key={preset.value}
                    value={preset.value}
                    className="px-4 py-1 text-sm cursor-pointer"
                  >
                    {preset.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              {showCustomInput && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Hours"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    className="flex-1"
                    min="1"
                  />
                  <span className="text-sm text-muted-foreground">hours</span>
                </div>
              )}

            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirmBan}
            disabled={
              !reason.trim() || (duration === 'custom' && !customDuration)
            }
          >
            Ban User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
