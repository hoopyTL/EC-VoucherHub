// @voucher/client — Entry point placeholder
//console.log('🎨 VoucherHub Client — ready for implementation')
const API = 'http://localhost:4000/api'

const root = document.querySelector<HTMLDivElement>('#root')

if (!root) {
  throw new Error('Root element not found')
}

root.innerHTML = `
  <div style="
    max-width: 800px;
    margin: 30px auto;
    font-family: Arial, sans-serif;
    line-height: 1.5;
  ">
    <h1>VoucherHub - Test TASK-006</h1>

    <div style="padding:15px; background:#f4f4f4; margin-bottom:20px;">
      <h3>Thông tin test</h3>

      <label>User ID</label><br>
      <input
        id="userId"
        placeholder="Dán user id từ Prisma Studio"
        style="width:100%; padding:8px; margin-bottom:10px;"
      >

      <label>Role</label><br>
      <select id="role" style="padding:8px;">
        <option value="PARTNER">PARTNER</option>
        <option value="ADMIN">ADMIN</option>
        <option value="CUSTOMER">CUSTOMER</option>
      </select>
    </div>

    <hr>

    <h2>1. Đăng ký Partner</h2>

    <input
      id="legalName"
      placeholder="Tên doanh nghiệp"
      value="ABC Food Company"
      style="width:100%; padding:8px; margin-bottom:8px;"
    >

    <input
      id="taxCode"
      placeholder="Mã số thuế"
      value="0312345678"
      style="width:100%; padding:8px; margin-bottom:8px;"
    >

    <input
      id="representative"
      placeholder="Người đại diện"
      value="Nguyen Van A"
      style="width:100%; padding:8px; margin-bottom:8px;"
    >

    <button id="registerPartner">
      Đăng ký Partner
    </button>

    <button id="getPartner">
      Xem Partner của tôi
    </button>

    <hr>

    <h2>2. Cập nhật Partner</h2>

    <input
      id="newLegalName"
      placeholder="Tên doanh nghiệp mới"
      value="ABC Food Company Updated"
      style="width:100%; padding:8px; margin-bottom:8px;"
    >

    <button id="updatePartner">
      Cập nhật
    </button>

    <hr>

    <h2>3. Chi nhánh</h2>

    <input
      id="branchName"
      placeholder="Tên chi nhánh"
      value="Chi nhánh Quận 1"
      style="width:100%; padding:8px; margin-bottom:8px;"
    >

    <input
      id="branchAddress"
      placeholder="Địa chỉ"
      value="123 Nguyễn Huệ"
      style="width:100%; padding:8px; margin-bottom:8px;"
    >

    <input
      id="branchRegion"
      placeholder="Khu vực"
      value="HCM"
      style="width:100%; padding:8px; margin-bottom:8px;"
    >

    <button id="createBranch">
      Thêm chi nhánh
    </button>

    <br><br>

    <input
      id="branchId"
      type="number"
      placeholder="Branch ID"
      style="padding:8px;"
    >

    <button id="deleteBranch">
      Xóa chi nhánh
    </button>

    <hr>

    <h2>4. Admin duyệt Partner</h2>

    <input
      id="partnerId"
      placeholder="Partner ID"
      style="width:100%; padding:8px; margin-bottom:8px;"
    >

    <button id="approvePartner">
      Approve
    </button>

    <button id="rejectPartner">
      Reject
    </button>

    <button id="lockPartner">
      Lock
    </button>

    <button id="unlockPartner">
      Unlock
    </button>

    <hr>

    <h2>Response</h2>

    <pre id="result" style="
      padding:15px;
      background:#111;
      color:#eee;
      min-height:150px;
      white-space:pre-wrap;
      overflow:auto;
    "></pre>
  </div>
`

function value(id: string) {
  return document.querySelector<HTMLInputElement>(`#${id}`)!.value
}

function getHeaders(json = false): HeadersInit {
  const headers: Record<string, string> = {
    'x-user-id': value('userId'),
    'x-role': document.querySelector<HTMLSelectElement>('#role')!.value
  }

  if (json) {
    headers['Content-Type'] = 'application/json'
  }

  return headers
}

const result = document.querySelector<HTMLPreElement>('#result')!

async function request(url: string, options: RequestInit = {}) {
  try {
    result.textContent = 'Đang gửi request...'

    const response = await fetch(`${API}${url}`, options)

    let data: unknown

    if (response.status === 204) {
      data = {
        success: true,
        message: 'No content'
      }
    } else {
      data = await response.json()
    }

    result.textContent = JSON.stringify(
      {
        httpStatus: response.status,
        response: data
      },
      null,
      2
    )

    return data
  } catch (error) {
    result.textContent = error instanceof Error ? error.message : 'Request failed'

    return null
  }
}

// --------------------
// Partner
// --------------------

document.querySelector('#registerPartner')!.addEventListener('click', async () => {
  await request('/partners', {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({
      legalName: value('legalName'),
      taxCode: value('taxCode'),
      representative: value('representative')
    })
  })
})

document.querySelector('#getPartner')!.addEventListener('click', async () => {
  await request('/partner', {
    headers: getHeaders()
  })
})

document.querySelector('#updatePartner')!.addEventListener('click', async () => {
  await request('/partner', {
    method: 'PATCH',
    headers: getHeaders(true),
    body: JSON.stringify({
      legalName: value('newLegalName')
    })
  })
})

// --------------------
// Branch
// --------------------

document.querySelector('#createBranch')!.addEventListener('click', async () => {
  await request('/partner/branches', {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({
      name: value('branchName'),
      address: value('branchAddress'),
      region: value('branchRegion')
    })
  })
})

document.querySelector('#deleteBranch')!.addEventListener('click', async () => {
  const branchId = value('branchId')

  await request(`/partner/branches/${branchId}`, {
    method: 'DELETE',
    headers: getHeaders()
  })
})

// --------------------
// Admin
// --------------------

document.querySelector('#approvePartner')!.addEventListener('click', async () => {
  const partnerId = value('partnerId')

  await request(`/admin/partners/${partnerId}/approval`, {
    method: 'PATCH',
    headers: getHeaders(true),
    body: JSON.stringify({
      action: 'approve'
    })
  })
})

document.querySelector('#rejectPartner')!.addEventListener('click', async () => {
  const partnerId = value('partnerId')

  await request(`/admin/partners/${partnerId}/approval`, {
    method: 'PATCH',
    headers: getHeaders(true),
    body: JSON.stringify({
      action: 'reject',
      reason: 'Thông tin chưa hợp lệ'
    })
  })
})

document.querySelector('#lockPartner')!.addEventListener('click', async () => {
  const partnerId = value('partnerId')

  await request(`/admin/partners/${partnerId}/lock`, {
    method: 'PATCH',
    headers: getHeaders(true),
    body: JSON.stringify({
      action: 'lock'
    })
  })
})

document.querySelector('#unlockPartner')!.addEventListener('click', async () => {
  const partnerId = value('partnerId')

  await request(`/admin/partners/${partnerId}/lock`, {
    method: 'PATCH',
    headers: getHeaders(true),
    body: JSON.stringify({
      action: 'unlock'
    })
  })
})
