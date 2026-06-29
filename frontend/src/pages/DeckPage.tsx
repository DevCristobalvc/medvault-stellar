import { Download } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DECK_URL = '/deck.pdf'

export function DeckPage() {
  return (
    <div className="flex flex-col flex-1 gap-3 px-4 py-4 md:px-8">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-base font-semibold tracking-tight">Pitch Deck</h1>
        <a
          href={DECK_URL}
          download="medvault-deck.pdf"
          className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </a>
      </div>

      <object
        data={DECK_URL}
        type="application/pdf"
        className="w-full flex-1 min-h-[70dvh] rounded-lg border border-border bg-muted/20"
      >
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Your browser can't display the PDF inline.
          </p>
          <a
            href={DECK_URL}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ size: 'sm' }))}
          >
            Open the deck
          </a>
        </div>
      </object>
    </div>
  )
}
