import { Copy, Trash2 } from 'lucide-react'
import { Button } from './ui/button'

export type contextMenuProps = {
  id: string
  top: number
  left: number
}

export const ContextMenu = ({
  data,
  onClose,
  onDuplicate,
  onDelete,
}: {
  data: contextMenuProps
  onClose: () => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}) => (
  <div
    style={{ top: data.top, left: data.left }}
    className="fixed z-50 p-4 -m-8"
    onMouseLeave={onClose}
  >
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg py-1">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start px-3 py-1 h-8"
        onClick={() => {
          onDuplicate(data.id)
          onClose()
        }}
      >
        <Copy className="h-3 w-3 mr-2" />
        Duplicate
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start px-3 py-1 h-8 text-red-600 hover:text-red-700"
        onClick={() => {
          onDelete(data.id)
          onClose()
        }}
      >
        <Trash2 className="h-3 w-3 mr-2" />
        Delete
      </Button>
    </div>
  </div>
)