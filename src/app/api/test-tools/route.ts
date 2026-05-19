import { NextRequest, NextResponse } from 'next/server';

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad'];
const SERVICES = ['SERVICE_1', 'SERVICE_2', 'SERVICE_3'];
const NAMES = ['Rahul Sharma', 'Priya Singh', 'Amit Patel', 'Neha Gupta', 'Vikram Kumar', 
                'Anjali Mehta', 'Rohan Joshi', 'Deepika Nair', 'Arjun Reddy', 'Kavita Rao'];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

  if (action === 'GENERATE_LEADS') {
    const promises = Array.from({ length: 10 }, (_, i) => {
      const service = SERVICES[i % 3];
      const phone = `9${String(Date.now()).slice(-9)}`.slice(0, 9) + String(i);
      
      return fetch(`${baseUrl}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: NAMES[i % NAMES.length],
          phone: phone.slice(0, 10),
          city: CITIES[i % CITIES.length],
          serviceCode: service,
          description: `Test lead ${i + 1} - concurrent generation test at ${new Date().toISOString()}`,
        }),
      }).then(async (r) => {
        const data = await r.json();
        return { status: r.status, success: r.ok, data };
      }).catch((e) => ({ status: 500, success: false, error: e.message }));
    });

    const results = await Promise.all(promises);
    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({ success: true, total: 10, succeeded, failed, results });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
