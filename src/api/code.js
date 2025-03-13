import request from "@/utils/request.js"

export const getCode = (data) => {
  return request({
    url: '/api/code',
    method: 'post',
    data: {
      mainClassStr: data
    }
  })
}
