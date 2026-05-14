"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, type SelectOption } from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  total: number
  pageSizeOptions?: number[]
}

const PAGE_SIZE_OPTIONS: SelectOption[] = [
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
]

export function Pagination({ total, pageSizeOptions }: PaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const limit = parseInt(searchParams.get("limit") || "50")
  const offset = parseInt(searchParams.get("offset") || "0")
  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(total / limit)
  const hasMore = offset + limit < total
  const hasPrev = offset > 0

  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + limit, total)

  const sizeOptions: SelectOption[] = pageSizeOptions
    ? pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))
    : PAGE_SIZE_OPTIONS

  const navigate = (newLimit: number, newOffset: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("limit", String(newLimit))
    params.set("offset", String(newOffset))
    router.push(`${pathname}?${params.toString()}`)
  }

  if (total === 0) return null

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4 py-4"
    >
      <div className="flex items-center gap-3 text-sm text-[var(--signal-fg-secondary)]">
        <span>
          Showing {from}&ndash;{to} of {total}
        </span>
        <Select
          value={String(limit)}
          onValueChange={(v) => navigate(Number(v), 0)}
          options={sizeOptions}
          size="sm"
          className="w-[70px]"
        />
        <span>per page</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="icon-sm"
          onClick={() => navigate(limit, offset - limit)}
          disabled={!hasPrev}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm min-w-[4rem] text-center text-[var(--signal-fg-secondary)]">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="default"
          size="icon-sm"
          onClick={() => navigate(limit, offset + limit)}
          disabled={!hasMore}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  )
}
