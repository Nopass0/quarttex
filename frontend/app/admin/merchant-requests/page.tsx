'use client'
import { useEffect, useState } from 'react'
import { adminApi } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { format } from 'date-fns'

interface LogItem {
  id: string
  merchantId: string
  merchantName: string
  type: string
  data: any
  createdAt: string
}

export default function MerchantRequestsPage() {
  const [logs, setLogs] = useState<LogItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => { loadLogs() }, [page])

  const loadLogs = async () => {
    try {
      const res = await adminApi.getMerchantRequestLogs({ page, limit: 20 })
      setLogs(res.data || [])
      setTotalPages(res.pagination?.totalPages || 1)
    } catch (e) {
      console.error('Failed to load logs', e)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Merchant Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>{log.id}</TableCell>
                  <TableCell>{log.merchantName}</TableCell>
                  <TableCell>{log.type}</TableCell>
                  <TableCell>
                    <pre className="whitespace-pre-wrap text-xs max-w-xs overflow-x-auto">{JSON.stringify(log.data)}</pre>
                  </TableCell>
                  <TableCell>{format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" onClick={e => { e.preventDefault(); if(page>1) setPage(page-1) }} />
                  </PaginationItem>
                  {[...Array(totalPages)].map((_,i)=>{const p=i+1;return(
                    <PaginationItem key={p}>
                      <PaginationLink href="#" onClick={e=>{e.preventDefault();setPage(p)}} isActive={p===page}>{p}</PaginationLink>
                    </PaginationItem>)})}
                  <PaginationItem>
                    <PaginationNext href="#" onClick={e=>{e.preventDefault(); if(page<totalPages) setPage(page+1)}} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
