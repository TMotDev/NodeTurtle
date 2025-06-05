import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Filter, MoreHorizontal, Search } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import Header from '@/components/Header'

export const Route = createFileRoute('/admin/users')({
  component: AdminUsers,
})

type UserRole = 'user' | 'premium' | 'mod' | 'admin'
type UserStatus = 'not_activated' | 'activated' | 'banned'

interface User {
  id: string
  username: string
  email: string
  age: number
  role: UserRole
  status: UserStatus
  banReason?: string
  createdAt: string
  lastLogin: string
}

// Mock data - replace with real API calls
const mockUsers: Array<User> = [
  {
    id: '1',
    username: 'john_doe',
    email: 'john.doe@example.com',
    age: 28,
    role: 'user',
    status: 'activated',
    createdAt: '2024-01-15',
    lastLogin: '2024-06-01',
  },
  {
    id: '2',
    username: 'jane_smith',
    email: 'jane.smith@example.com',
    age: 32,
    role: 'premium',
    status: 'activated',
    createdAt: '2024-02-20',
    lastLogin: '2024-06-04',
  },
  {
    id: '3',
    username: 'bob_wilson',
    email: 'bob.wilson@example.com',
    age: 45,
    role: 'mod',
    status: 'activated',
    createdAt: '2024-01-10',
    lastLogin: '2024-06-05',
  },
  {
    id: '4',
    username: 'alice_johnson',
    email: 'alice.johnson@example.com',
    age: 24,
    role: 'user',
    status: 'not_activated',
    createdAt: '2024-06-01',
    lastLogin: 'Never',
  },
  {
    id: '5',
    username: 'spam_user',
    email: 'spam@bad.com',
    age: 19,
    role: 'user',
    status: 'banned',
    banReason: 'Spamming and inappropriate content',
    createdAt: '2024-05-15',
    lastLogin: '2024-05-20',
  },
]

function AdminUsers() {
  const [users, setUsers] = useState<Array<User>>(mockUsers)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [banReason, setBanReason] = useState('')

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || user.status === statusFilter
    const matchesRole = roleFilter === 'all' || user.role === roleFilter

    return matchesSearch && matchesStatus && matchesRole
  })

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'activated':
        return (
          <Badge variant="default" className="bg-green-500">
            Activated
          </Badge>
        )
      case 'not_activated':
        return <Badge variant="secondary">Not Activated</Badge>
      case 'banned':
        return <Badge variant="destructive">Banned</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <Badge variant="default" className="bg-purple-500">
            Admin
          </Badge>
        )
      case 'mod':
        return (
          <Badge variant="default" className="bg-blue-500">
            Moderator
          </Badge>
        )
      case 'premium':
        return (
          <Badge variant="default" className="bg-yellow-500">
            Premium
          </Badge>
        )
      case 'user':
        return <Badge variant="outline">User</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, role: newRole } : user,
      ),
    )
  }

  const handleBanUser = (user: User) => {
    setSelectedUser(user)
    setBanDialogOpen(true)
  }

  const confirmBan = () => {
    if (selectedUser) {
      setUsers((prev) =>
        prev.map((user) =>
          user.id === selectedUser.id
            ? { ...user, status: 'banned' as UserStatus, banReason }
            : user,
        ),
      )
    }
    setBanDialogOpen(false)
    setBanReason('')
    setSelectedUser(null)
  }

  const handleUnbanUser = (userId: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId
          ? { ...user, status: 'activated' as UserStatus, banReason: undefined }
          : user,
      ),
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
        <Header />
      <main className="flex-grow flex justify-center p-4">

        <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">
              User Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage user accounts, roles, and permissions
            </p>
          </div>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="activated">Activated</SelectItem>
                <SelectItem value="not_activated">Not Activated</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="mod">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.username}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.age}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(user.status)}
                        {user.status === 'banned' && user.banReason && (
                          <span className="text-xs text-muted-foreground">
                            {user.banReason}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{user.createdAt}</TableCell>
                    <TableCell>{user.lastLogin}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() =>
                              navigator.clipboard.writeText(user.email)
                            }
                          >
                            Copy email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(user.id, 'user')}
                          >
                            Set as User
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(user.id, 'premium')}
                          >
                            Set as Premium
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(user.id, 'mod')}
                          >
                            Set as Moderator
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.status === 'banned' ? (
                            <DropdownMenuItem
                              onClick={() => handleUnbanUser(user.id)}
                              className="text-green-600"
                            >
                              Unban User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleBanUser(user)}
                              className="text-red-600"
                            >
                              Ban User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Ban User Dialog */}
          <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ban User</DialogTitle>
                <DialogDescription>
                  Are you sure you want to ban {selectedUser?.username}? Please
                  provide a reason.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="ban-reason" className="text-right">
                    Reason
                  </Label>
                  <Textarea
                    id="ban-reason"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    className="col-span-3"
                    placeholder="Enter ban reason..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setBanDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmBan}
                  disabled={!banReason.trim()}
                >
                  Ban User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  )
}
