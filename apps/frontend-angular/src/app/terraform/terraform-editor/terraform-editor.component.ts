import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input,
  output,
} from '@angular/core'
import loader from '@monaco-editor/loader'
import type * as Monaco from 'monaco-editor'

@Component({
  selector: 'app-terraform-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './terraform-editor.component.html',
  styleUrl: './terraform-editor.component.scss',
})
export class TerraformEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>

  readonly value = input.required<string>()
  readonly valueChange = output<string>()

  private editor: Monaco.editor.IStandaloneCodeEditor | null = null
  private monaco: typeof Monaco | null = null

  constructor() {
    effect(() => {
      const v = this.value()
      if (this.editor && this.editor.getValue() !== v) {
        this.editor.setValue(v)
      }
    })
  }

  ngAfterViewInit(): void {
    loader.config({ paths: { vs: '/assets/monaco/min/vs' } })
    loader.init().then((monaco) => {
      this.monaco = monaco
      this.registerHclLanguage(monaco)
      monaco.editor.defineTheme('cloudops-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#070910',
        },
      })
      this.editor = monaco.editor.create(this.hostRef.nativeElement, {
        value: this.value(),
        language: 'hcl',
        theme: 'cloudops-dark',
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
      })
      const ed = this.editor
      if (!ed) return
      ed.onDidChangeModelContent(() => {
        this.valueChange.emit(ed.getValue())
      })
    })
  }

  ngOnDestroy(): void {
    this.editor?.dispose()
  }

  private registerHclLanguage = (monaco: typeof Monaco): void => {
    const id = 'hcl'
    if (monaco.languages.getLanguages().some((l) => l.id === id)) return
    monaco.languages.register({ id })
    monaco.languages.setMonarchTokensProvider(id, {
      tokenizer: {
        root: [
          [/module|resource|variable|output|provider/, 'keyword'],
          [/"[^"]*"/, 'string'],
          [/\b\d+\b/, 'number'],
          [/#.*$/, 'comment'],
        ],
      },
    })
  }
}
