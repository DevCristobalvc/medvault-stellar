import { LANGUAGES, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface LanguageSelectorProps {
  lang: Lang
  onChange: (l: Lang) => void
}

export function LanguageSelector({ lang, onChange }: LanguageSelectorProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-muted/40">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          onClick={() => onChange(l.code)}
          className={cn(
            'px-2 py-0.5 rounded text-xs font-medium transition-colors',
            lang === l.code
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
