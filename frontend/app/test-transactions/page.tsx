"use client"

import { useEffect, useState } from "react"
import { traderApi } from "@/services/api"
import { useTraderAuth } from "@/stores/auth"

export default function TestTransactionsPage() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const token = useTraderAuth((state) => state.token)

  useEffect(() => {
    if (!token) {
      setError("No token")
      setLoading(false)
      return
    }

    traderApi.getTransactions()
      .then(response => {
        console.log("Test page - API response:", response)
        setData(response)
        setLoading(false)
      })
      .catch(err => {
        console.error("Test page - Error:", err)
        setError(err.message)
        setLoading(false)
      })
  }, [token])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!data) return <div>No data</div>

  return (
    <div style={{ padding: "20px" }}>
      <h1>Transaction Test Page</h1>
      <p>Token exists: {token ? "YES" : "NO"}</p>
      <p>Response keys: {Object.keys(data).join(", ")}</p>
      <p>Has data array: {data.data ? "YES" : "NO"}</p>
      <p>Data length: {data.data?.length || 0}</p>
      <p>Has transactions array: {data.transactions ? "YES" : "NO"}</p>
      <p>Transactions length: {data.transactions?.length || 0}</p>
      
      <h2>Raw Response:</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}