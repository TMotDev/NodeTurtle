import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { MoreHorizontal, Search } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import type { User } from '@/services/api'
import { Role } from '@/lib/authStore'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import Header from '@/components/Header'
import { listUsers, unbanUser, updateUserRole } from '@/services/api'
import { getTimeSince, getTimeUntil } from '@/lib/utils'
import BanDialog from '@/components/BanDialog'

export const Route = createFileRoute('/admin/users')({
  component: AdminUsers,
})

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <Skeleton className="h-5 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-28" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-28" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-8 rounded-md" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

function AdminUsers() {
  const [users, setUsers] = useState<Array<User>>([])
  const [loading, setLoading] = useState(true)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all',
  })
  const [searchTerm, setSearchTerm] = useState('')

  // dialog states
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const fetchUsers = useCallback(
    async (currentFilters: any) => {
      setLoading(true)
      try {
        const queryParams: any = { page, limit: 10 }
        if (currentFilters.role !== 'all')
          queryParams.role = currentFilters.role
        if (currentFilters.status !== 'all') {
          queryParams.activated = currentFilters.status === 'activated'
        }
        if (currentFilters.search_term)
          queryParams.search_term = currentFilters.search_term

        const result = await listUsers(queryParams)

        if(result.success)
        {
          setUsers(result.data.users)
          setTotalPages(Math.ceil(result.data.meta.total / 10))
        }
        else{
          toast.error(`Failed to fetch users. ${result.error.message}`)
        }

      } catch (err) {
        toast.error('Failed to fetch users. Please try again.')
      } finally {
        setLoading(false)
      }
    },
    [page],
  )

  useEffect(() => {
    fetchUsers(filters)
  }, [filters, page, fetchUsers])

  const handleSearch = () => {
    setPage(1)
    fetchUsers({ ...filters, search_term: searchTerm })
  }

  const handleFilterChange = (key: 'role' | 'status', value: string) => {
    setPage(1)
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const getStatusBadges = (user: User) => {
    const badges = []

    if (user.activated) {
      badges.push(
        <Badge key="activated" variant="default" className="bg-green-500">
          Activated
        </Badge>,
      )
    } else {
      badges.push(
        <Badge key="not-activated" variant="secondary">
          Not Activated
        </Badge>,
      )
    }

    if (user.ban) {
      const now = new Date()
      const expiresAt = new Date(user.ban.expires_at as string)

      if (expiresAt > now) {
        const timeRemaining = getTimeUntil(user.ban.expires_at as string)
        badges.push(
          <Badge key="banned" variant="destructive">
            Banned ({timeRemaining})
          </Badge>,
        )
      } else {
        badges.push(
          <Badge
            key="ban-expired"
            variant="outline"
            className="border-orange-500 text-orange-600"
          >
            Ban Expired (
            {new Intl.DateTimeFormat('en-CA').format(
              new Date(user.ban.expires_at as string),
            )}
            )
          </Badge>,
        )
      }
    }
    return badges
  }

  const getRoleBadge = (role: Role) => {
    const roleColors: Record<Role, string> = {
      admin: 'bg-purple-500',
      moderator: 'bg-blue-500',
      premium: 'bg-yellow-500',
      user: 'outline',
    }
    const roleName: Record<Role, string> = {
      admin: 'Admin',
      moderator: 'Moderator',
      premium: 'Premium',
      user: 'User',
    }
    return (
      <Badge
        variant={role === 'user' ? 'outline' : 'default'}
        className={roleColors[role]}
      >
        {roleName[role]}
      </Badge>
    )
  }

  const handleRoleChange = async (userId: string, newRole: Role) => {
    const result = await updateUserRole(userId, newRole)

    if (result.success) {
      toast.success(`User role updated`)
    } else {
      toast.error(`Error when updating role: ${result.error.message}`)
    }

    fetchUsers(filters)
  }

  const handleBanUser = (user: User) => {
    setSelectedUser(user)
    setBanDialogOpen(true)
  }

  const handleBanDialogClose = () => {
    setBanDialogOpen(false)
    setSelectedUser(null)
  }

  const handleBanSubmit = () => {
    setBanDialogOpen(false)
    setSelectedUser(null)
    fetchUsers(filters)
  }

  const handleUnbanUser = async (userId: string) => {
    const result = await unbanUser(userId)
    if (result.success) {
      toast.success(`User successfully unbanned`)
    } else {
      toast.error(`Error when unbanning a user: ${result.error.message}`)
    }

    fetchUsers(filters)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex justify-center p-4">
        <Toaster richColors position="top-center" expand />
        <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">
              User Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage user accounts, roles, and permissions
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 flex gap-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-8"
              />
              <Button onClick={handleSearch}>Search</Button>
            </div>
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="activated">Activated</SelectItem>
                <SelectItem value="not_activated">Not Activated</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.role}
              onValueChange={(value) => handleFilterChange('role', value)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Account Age</TableHead>
                  <TableHead title="Last time the user has logged in">
                    Last Active
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeleton />
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.username}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap gap-1">
                            {getStatusBadges(user)}
                          </div>
                          {user.ban && (
                            <span
                              title={user.ban.reason}
                              className="text-xs text-muted-foreground overflow-hidden text-ellipsis w-36"
                            >
                              {user.ban.reason}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getTimeSince(user.created_at)}</TableCell>
                      <TableCell>
                        {user.last_login
                          ? getTimeSince(user.last_login)
                          : 'Never'}
                      </TableCell>
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
                                handleRoleChange(user.id, Role.User)
                              }
                            >
                              Set as User
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleRoleChange(user.id, Role.Premium)
                              }
                            >
                              Set as Premium
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleRoleChange(user.id, Role.Moderator)
                              }
                            >
                              Set as Moderator
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.ban ? (
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      href="#"
                      isActive={page === i + 1}
                      onClick={() => setPage(i + 1)}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>

          <BanDialog
            isOpen={banDialogOpen}
            selectedUser={selectedUser}
            onClose={handleBanDialogClose}
            onSubmit={handleBanSubmit}
          />
        </div>
      </main>
    </div>
  )
}
