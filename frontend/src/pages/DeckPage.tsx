import { Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

const DECK_URL = '/deck.pdf'

export function DeckPage() {
  return (
    <div className="flex flex-col flex-1 gap-3 px-4 py-4 md:px-8">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-base font-semibold tracking-tight">Pitch Deck</h1>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <a href={DECK_URL} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </a>
          </Button>
          <Button asChild size="sm" className="gap-1.5">
            <a href={DECK_URL} download="medvault-deck.pdf">
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          </Button>
        </div>
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
          <Button asChild size="sm">
            <a href={DECK_URL} target="_blank" rel="noreferrer">
              Open the deck
            </a>
          </Button>
        </div>
      </object>
    </div>
  )
}
