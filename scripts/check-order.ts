
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Try to load .env from current directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('Current working directory:', process.cwd());
console.log('Environment variables loaded keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY; 

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Checked VITE_SUPABASE_URL/SUPABASE_URL and VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY/VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 3. Search logic
async function checkSpecificOrder() {
    const shortOrderId = 'ed7844a9';
    console.log(`Searching for order containing: ${shortOrderId}...`);

    // 1. Fetch recent orders and filter in memory
    const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Error fetching orders:', error);
    } else if (orders && orders.length > 0) {
        const found = orders.filter((o: any) => o.id.startsWith(shortOrderId));
        if (found.length > 0) {
            console.log('Found Orders:', found);
        } else {
            console.log('No orders found with that ID prefix in the last 50 orders.');
        }
    } else {
        console.log('No orders found.');
    }

    // 2. Fetch recent commitments
    const { data: commitments, error: commError } = await supabase
        .from('group_buy_commitments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (commError) {
         console.error('Error fetching commitments:', commError);
    } else if (commitments && commitments.length > 0) {
        const found = commitments.filter((c: any) => c.id.startsWith(shortOrderId));
        if (found.length > 0) {
             console.log('Found Commitments:', found);
        } else {
            console.log('No commitments found with that ID prefix in the last 50.');
        }
    } else {
        console.log('No commitments found.');
    }
}

checkSpecificOrder();
