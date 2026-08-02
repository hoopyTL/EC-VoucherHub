const API = 'http://localhost:4000/api'

const root = document.querySelector<HTMLDivElement>('#root')!

root.innerHTML = `
  <div style="
    max-width: 900px;
    margin: 30px auto;
    font-family: Arial, sans-serif;
    line-height: 1.5;
  ">
    <h1>VoucherHub - Test TASK-007</h1>

    <hr />

    <h2>Thông tin test</h2>

    <label>User ID</label>
    <input
      id="userId"
      placeholder="User ID của Partner"
      style="width:100%;padding:8px;margin-bottom:10px"
    />

    <label>Role</label>
    <select
      id="role"
      style="width:100%;padding:8px;margin-bottom:10px"
    >
      <option value="PARTNER">PARTNER</option>
      <option value="ADMIN">ADMIN</option>
      <option value="CUSTOMER">CUSTOMER</option>
    </select>

    <button id="loadData">
      Tải dữ liệu từ Database
    </button>

    <p id="loadStatus"></p>

    <hr />

    <h2>1. Tạo Voucher</h2>

    <label>Danh mục</label>
    <select
      id="categoryId"
      style="width:100%;padding:8px;margin-bottom:8px"
    >
      <option value="">
        -- Chọn danh mục --
      </option>
    </select>

    <label>Tên Voucher</label>
    <input
      id="name"
      value="Voucher Buffet 200K"
      style="width:100%;padding:8px;margin-bottom:8px"
    />

    <label>Mô tả</label>
    <input
      id="description"
      value="Voucher dùng cho buffet cuối tuần"
      style="width:100%;padding:8px;margin-bottom:8px"
    />

    <label>Giá gốc</label>
    <input
      id="originalPrice"
      type="number"
      value="200000"
      style="width:100%;padding:8px;margin-bottom:8px"
    />

    <label>Giá bán</label>
    <input
      id="salePrice"
      type="number"
      value="150000"
      style="width:100%;padding:8px;margin-bottom:8px"
    />

    <label>Ngày bắt đầu bán</label>
    <input
      id="saleStart"
      type="datetime-local"
      value="2026-08-03T00:00"
      style="width:100%;padding:8px;margin-bottom:8px"
    />

    <label>Ngày kết thúc bán</label>
    <input
      id="saleEnd"
      type="datetime-local"
      value="2026-08-20T23:59"
      style="width:100%;padding:8px;margin-bottom:8px"
    />

    <label>Ngày bắt đầu sử dụng</label>
    <input
      id="usageStart"
      type="datetime-local"
      value="2026-08-03T00:00"
      style="width:100%;padding:8px;margin-bottom:8px"
    />

    <label>Ngày hết hạn sử dụng</label>
    <input
      id="usageEnd"
      type="datetime-local"
      value="2026-09-30T23:59"
      style="width:100%;padding:8px;margin-bottom:8px"
    />

    <label>Tổng số lượng</label>
    <input
      id="totalQuantity"
      type="number"
      value="100"
      style="width:100%;padding:8px;margin-bottom:8px"
    />

    <label>
      <input id="isMultiUse" type="checkbox" />
      Voucher dùng nhiều lần
    </label>

    <br /><br />

    <label>Số lần sử dụng mỗi code</label>
    <input
      id="usesPerCode"
      type="number"
      placeholder="Chỉ nhập nếu dùng nhiều lần"
      style="width:100%;padding:8px;margin-bottom:8px"
    />

    <label>Chi nhánh áp dụng</label>

    <select
      id="branchIds"
      multiple
      size="5"
      style="width:100%;padding:8px;margin-bottom:8px"
    ></select>

    <small>
      Giữ Ctrl để chọn nhiều chi nhánh.
      Không chọn = không giới hạn chi nhánh.
    </small>

    <br /><br />

    <button id="createVoucher">
      Tạo Voucher
    </button>

    <hr />

    <h2>2. Voucher của Partner</h2>

    <button id="reloadVouchers">
      Tải lại danh sách Voucher
    </button>

    <br /><br />

    <label>Chọn Voucher</label>

    <select
      id="voucherId"
      style="width:100%;padding:8px;margin-bottom:10px"
    >
      <option value="">
        -- Chọn Voucher --
      </option>
    </select>

    <hr />

    <h2>3. Sửa Voucher DRAFT</h2>

    <label>Tên mới</label>

    <input
      id="updateName"
      value="Voucher Buffet 200K Updated"
      style="width:100%;padding:8px;margin-bottom:10px"
    />

    <button id="updateVoucher">
      Cập nhật Voucher
    </button>

    <hr />

    <h2>4. Partner gửi duyệt</h2>

    <button id="submitVoucher">
      Submit Voucher
    </button>

    <button id="returnDraft">
      Return to Draft
    </button>

    <hr />

    <h2>5. Admin duyệt Voucher</h2>

    <button id="approveVoucher">
      Approve
    </button>

    <button id="rejectVoucher">
      Reject
    </button>

    <hr />

    <h2>6. Admin thay đổi trạng thái</h2>

    <button id="publishVoucher">
      Publish
    </button>

    <button id="suspendVoucher">
      Suspend
    </button>

    <button id="unpublishVoucher">
      Unpublish
    </button>

    <hr />

    <h2>Response</h2>

    <pre
      id="response"
      style="
        background:#f4f4f4;
        padding:15px;
        border-radius:6px;
        white-space:pre-wrap;
        min-height:120px;
      "
    ></pre>
  </div>
`

function value(id: string): string {
  const element = document.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)

  return element?.value.trim() ?? ''
}

function getHeaders(includeJson = false): HeadersInit {
  const headers: Record<string, string> = {
    'x-user-id': value('userId'),
    'x-role': value('role') || 'PARTNER'
  }

  if (includeJson) {
    headers['Content-Type'] = 'application/json'
  }

  return headers
}

function showResponse(status: number, data: unknown): void {
  const output = document.querySelector<HTMLPreElement>('#response')!

  output.textContent = JSON.stringify(
    {
      httpStatus: status,
      response: data
    },
    null,
    2
  )
}

async function fetchApi(path: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`${API}${path}`, options)

    const data = response.status === 204 ? null : await response.json()

    showResponse(response.status, data)

    return {
      status: response.status,
      data
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    showResponse(0, {
      success: false,
      error: message
    })

    return {
      status: 0,
      data: null
    }
  }
}

function toIso(value: string): string {
  return new Date(value).toISOString()
}

function selectedBranchIds(): number[] {
  const select = document.querySelector<HTMLSelectElement>('#branchIds')

  if (!select) {
    return []
  }

  return Array.from(select.selectedOptions).map((option) => Number(option.value))
}

type Category = {
  id: number
  name: string
}

type Branch = {
  id: number
  name: string
  address: string
  region: string
}

type Voucher = {
  id: string
  name: string
  status: string
}

async function loadCategories(): Promise<void> {
  const response = await fetch(`${API}/categories`)

  const result = await response.json()

  if (!result.success) {
    return
  }

  const select = document.querySelector<HTMLSelectElement>('#categoryId')!

  select.innerHTML = '<option value="">-- Chọn danh mục --</option>'

  for (const category of result.data as Category[]) {
    const option = document.createElement('option')

    option.value = String(category.id)

    option.textContent = category.name

    select.appendChild(option)
  }
}

async function loadBranches(): Promise<void> {
  const result = await fetchApi('/partner/branches/options', {
    headers: getHeaders()
  })

  if (result.status !== 200 || !result.data) {
    return
  }

  const response = result.data as {
    success: boolean
    data: Branch[]
  }

  if (!response.success) {
    return
  }

  const select = document.querySelector<HTMLSelectElement>('#branchIds')!

  select.innerHTML = ''

  for (const branch of response.data) {
    const option = document.createElement('option')

    option.value = String(branch.id)

    option.textContent = `${branch.name} - ${branch.region}`

    select.appendChild(option)
  }
}

async function loadVouchers(): Promise<void> {
  const result = await fetchApi('/partner/vouchers', {
    headers: getHeaders()
  })

  if (result.status !== 200 || !result.data) {
    return
  }

  const response = result.data as {
    success: boolean
    data: Voucher[]
  }

  if (!response.success) {
    return
  }

  const select = document.querySelector<HTMLSelectElement>('#voucherId')!

  const current = select.value

  select.innerHTML = '<option value="">-- Chọn Voucher --</option>'

  for (const voucher of response.data) {
    const option = document.createElement('option')

    option.value = voucher.id

    option.textContent = `${voucher.name} - ${voucher.status}`

    select.appendChild(option)
  }

  if (response.data.some((voucher) => voucher.id === current)) {
    select.value = current
  }
}

async function reloadDatabaseData(): Promise<void> {
  await loadCategories()
  await loadBranches()
  await loadVouchers()

  const status = document.querySelector<HTMLParagraphElement>('#loadStatus')!

  status.textContent = 'Đã tải Category, Branch và Voucher từ database.'
}

document.querySelector('#loadData')?.addEventListener('click', reloadDatabaseData)

document.querySelector('#reloadVouchers')?.addEventListener('click', loadVouchers)

document.querySelector('#createVoucher')?.addEventListener('click', async () => {
  const categoryId = value('categoryId')

  const usesPerCode = value('usesPerCode')

  const isMultiUse = document.querySelector<HTMLInputElement>('#isMultiUse')?.checked ?? false

  const body: Record<string, unknown> = {
    name: value('name'),
    description: value('description'),

    originalPrice: Number(value('originalPrice')),

    salePrice: Number(value('salePrice')),

    saleStart: toIso(value('saleStart')),

    saleEnd: toIso(value('saleEnd')),

    usageStart: toIso(value('usageStart')),

    usageEnd: toIso(value('usageEnd')),

    totalQuantity: Number(value('totalQuantity')),

    isMultiUse
  }

  if (categoryId) {
    body.categoryId = Number(categoryId)
  }

  if (usesPerCode) {
    body.usesPerCode = Number(usesPerCode)
  }

  const branches = selectedBranchIds()

  if (branches.length > 0) {
    body.branchIds = branches
  }

  const result = await fetchApi('/vouchers', {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(body)
  })

  if (result.status === 201) {
    await loadVouchers()
  }
})

document.querySelector('#updateVoucher')?.addEventListener('click', async () => {
  const voucherId = value('voucherId')

  if (!voucherId) {
    alert('Hãy chọn Voucher')
    return
  }

  const result = await fetchApi(`/vouchers/${voucherId}`, {
    method: 'PATCH',
    headers: getHeaders(true),
    body: JSON.stringify({
      name: value('updateName'),
      categoryId: value('categoryId') ? Number(value('categoryId')) : undefined
    })
  })

  if (result.status === 200) {
    await loadVouchers()
  }
})

document.querySelector('#submitVoucher')?.addEventListener('click', async () => {
  const voucherId = value('voucherId')

  if (!voucherId) {
    alert('Hãy chọn Voucher')
    return
  }

  const result = await fetchApi(`/vouchers/${voucherId}/submission`, {
    method: 'POST',
    headers: getHeaders()
  })

  if (result.status === 200) {
    await loadVouchers()
  }
})

document.querySelector('#returnDraft')?.addEventListener('click', async () => {
  const voucherId = value('voucherId')

  if (!voucherId) {
    alert('Hãy chọn Voucher')
    return
  }

  const result = await fetchApi(`/vouchers/${voucherId}/draft`, {
    method: 'POST',
    headers: getHeaders()
  })

  if (result.status === 200) {
    await loadVouchers()
  }
})

document.querySelector('#approveVoucher')?.addEventListener('click', async () => {
  const voucherId = value('voucherId')

  if (!voucherId) {
    alert('Hãy chọn Voucher')
    return
  }

  const result = await fetchApi(`/admin/vouchers/${voucherId}/approval`, {
    method: 'PATCH',
    headers: getHeaders(true),
    body: JSON.stringify({
      action: 'approve'
    })
  })

  if (result.status === 200) {
    await loadVouchers()
  }
})

document.querySelector('#rejectVoucher')?.addEventListener('click', async () => {
  const voucherId = value('voucherId')

  if (!voucherId) {
    alert('Hãy chọn Voucher')
    return
  }

  const result = await fetchApi(`/admin/vouchers/${voucherId}/approval`, {
    method: 'PATCH',
    headers: getHeaders(true),
    body: JSON.stringify({
      action: 'reject',
      reason: 'Voucher information is not valid'
    })
  })

  if (result.status === 200) {
    await loadVouchers()
  }
})

document.querySelector('#publishVoucher')?.addEventListener('click', async () => {
  await changeStatus('publish')
})

document.querySelector('#suspendVoucher')?.addEventListener('click', async () => {
  await changeStatus('suspend')
})

document.querySelector('#unpublishVoucher')?.addEventListener('click', async () => {
  await changeStatus('unpublish')
})

async function changeStatus(action: 'publish' | 'suspend' | 'unpublish'): Promise<void> {
  const voucherId = value('voucherId')

  if (!voucherId) {
    alert('Hãy chọn Voucher')
    return
  }

  const result = await fetchApi(`/admin/vouchers/${voucherId}/status`, {
    method: 'PATCH',
    headers: getHeaders(true),
    body: JSON.stringify({
      action
    })
  })

  if (result.status === 200) {
    await loadVouchers()
  }
}
