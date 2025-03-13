<template>
  <div class="editor-container">
    <!-- 代码编辑器组件 -->
    <CodeEditor
      ref="editorRef"
      class="editor-wrapper"
      :defCode="initialJavaCode"
    />

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <button @click="handleFormat" class="btn format-btn">格式化代码</button>
      <button @click="handleGetCode" class="btn get-code-btn">执行代码</button>
    </div>
  </div>

  <el-input
    v-model="codeRequest"
    class="w-full"
    type="textarea"
    :autosize="{ minRows: 10}"
    placeholder="等待执行结果..."
  />
</template>

<script setup>
import { ref } from 'vue'
import CodeEditor from '@/components/CodeEditor.vue'
import prettier from 'prettier/standalone'
import javaPlugin from 'prettier-plugin-java'
import {getCode} from "@/api/code.js";

// 编辑器实例引用
const editorRef = ref(null)

const codeRequest = ref('')

// 初始 Java 代码示例
const initialJavaCode = `public class Main {
  public static void main(String[] args) {
    System.out.println("Bocchi 世界第一可爱！");
  }
}`

// 格式化代码
const handleFormat = async () => {
  try {
    const rawCode = editorRef.value.getValue()

    // 使用 Prettier 格式化
    const formattedCode = await prettier.format(rawCode, {
      parser: 'java',
      plugins: [javaPlugin],
      tabWidth: 4,
      printWidth: 100,
      bracketSameLine: true
    })

    // 更新编辑器内容
    editorRef.value.setValue(formattedCode)
  } catch (error) {
    console.error('格式化失败:', error)
    alert(`格式化错误: ${error.message}`)
  }
}

// 获取代码内容
const handleGetCode = async () => {
  const request = (await getCode(editorRef.value.getValue()))
  console.log(request)
  codeRequest.value = request.result.consoleStr
}
</script>

<style scoped>
.editor-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.editor-wrapper {
  border: 2px solid #2c3e50;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.format-btn {
  background-color: #3498db;
  color: white;
}

.format-btn:hover {
  background-color: #2980b9;
}

.get-code-btn {
  background-color: #2ecc71;
  color: white;
}

.get-code-btn:hover {
  background-color: #27ae60;
}
</style>
