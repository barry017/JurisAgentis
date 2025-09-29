'use client'

import { useEffect, useState } from 'react'
// import { MobileSecurityProvider } from './MobileSecurity'

interface ClientOnlyMobileSecurityProps {
  children: React.ReactNode
}

export function ClientOnlyMobileSecurity({ children }: ClientOnlyMobileSecurityProps) {
  const [_hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  // Temporarily disable MobileSecurity to focus on Document Management System
  // TODO: Re-enable after fixing SSR compatibility issues
  return <>{children}</>

  // // During SSR and initial hydration, just render children without security wrapper
  // if (!hasMounted) {
  //   return <>{children}</>
  // }

  // // After hydration, render with full security features
  // return (
  //   <MobileSecurityProvider>
  //     {children}
  //   </MobileSecurityProvider>
  // )
}