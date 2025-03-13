<script setup>
import {ref, onMounted, onUnmounted} from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter } from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import { defaultKeymap, indentWithTab } from "@codemirror/commands"
import {foldKeymap, indentOnInput,foldGutter} from "@codemirror/language"
import { java } from "@codemirror/lang-java"
import { oneDark } from "@codemirror/theme-one-dark"

const editorContainer = ref(null)
const editor = ref(null)
const props = defineProps({
  defCode: {
    type: String,
    default: 'public class Main {\n    public static void main(String[] args) {\n        // Your code\n    }\n}'
  }
})

const baseExtensions = [
  lineNumbers(),
  highlightActiveLineGutter(),
  foldGutter({  // 新增折叠沟槽
    openText: "▾",
    closedText: "▸"
  }),
  keymap.of([...defaultKeymap,...foldKeymap, indentWithTab]),
  EditorState.tabSize.of(4),
  indentOnInput(4),
  EditorView.editable.of(true),
  EditorView.contentAttributes.of({
    'aria-autocomplete': 'none',
    'autocorrect': 'off',
    'spellcheck': 'false'
  })
]

onMounted(() => {
  editor.value = new EditorView({
    state: EditorState.create({
      doc: props.defCode,
      extensions: [
        ...baseExtensions,
        java(),
        oneDark
      ]
    }),
    parent: editorContainer.value
  })
})

onUnmounted(() => {
  editor.value?.destroy()
})

defineExpose({
  getValue: () => editor.value?.state.doc.toString() || '',
  setValue: (content) => {
    if (editor.value) {
      editor.value.dispatch({
        changes: {
          from: 0,
          to: editor.value.state.doc.length,
          insert: content
        }
      })
    }
  }
})
</script>

<template>
  <div ref="editorContainer" class="code-editor"></div>
</template>

<style>
.code-editor {
  height: 500px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
}

.cm-editor {
  height: 100%;
  font-size: 14px;
  font-family: 'Fira Code', monospace;
}

.cm-content {
  caret-color: #409eff; /* 光标颜色 */
}
</style>
