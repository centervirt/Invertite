import React from 'react'
import { useParams } from 'react-router-dom'

const Checkout = () => {
  const { planSlug } = useParams()
  return (
    <div className="min-h-screen bg-invertite-dark text-slate-200 p-8 flex items-center justify-center">
      <h1 className="text-2xl font-black text-white">Checkout del Plan: {planSlug} (Construyendo...)</h1>
    </div>
  )
}

export default Checkout
