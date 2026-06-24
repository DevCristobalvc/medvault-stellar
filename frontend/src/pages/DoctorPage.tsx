import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useWallet } from '@/hooks/useWallet'
import { DoctorAccess } from '@/components/DoctorAccess'
import { DocumentUpload } from '@/components/DocumentUpload'
import { WalletConnect } from '@/components/WalletConnect'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Stethoscope, Key } from 'lucide-react'

export function DoctorPage() {
  const { state } = useWallet()
  const [searchParams] = useSearchParams()
  const tokenId = searchParams.get('token')

  const [encryptionKey, setEncryptionKey] = useState<string | null>(null)
  const [keyInput, setKeyInput] = useState('')

  if (state.status !== 'connected') {
    return (
      <div className="flex flex-col items-center gap-6 px-5 py-16 text-center">
        <div className="rounded-full bg-primary/5 p-5">
          <Stethoscope className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Doctor portal</h2>
          <p className="text-sm text-muted-foreground mt-1">Connect your Freighter wallet to continue</p>
        </div>
        <WalletConnect />
      </div>
    )
  }

  if (tokenId) {
    return (
      <div className="flex flex-col gap-4 px-5 py-6 md:px-8 max-w-lg mx-auto">
        {!encryptionKey && (
          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Key className="h-4 w-4" />
                Encryption key
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Label htmlFor="key" className="text-xs text-muted-foreground">
                Paste the key you received from the patient
              </Label>
              <Input
                id="key"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Base64 encryption key..."
                className="font-mono text-xs"
              />
              <Button
                size="sm"
                disabled={!keyInput.trim()}
                onClick={() => setEncryptionKey(keyInput.trim())}
              >
                Decrypt record
              </Button>
            </CardContent>
          </Card>
        )}

        <DoctorAccess
          tokenId={tokenId}
          doctorPublicKey={state.publicKey}
          encryptionKey={encryptionKey}
        />
      </div>
    )
  }

  return (
    <div className="px-5 py-6 md:px-8 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold tracking-tight mb-6">New Record</h1>
      <DocumentUpload />
    </div>
  )
}
