const url = "https://pzkzvcflyfdbizhvpamj.supabase.co/rest/v1/egg_lots?select=id,observacao&limit=1";
const headers = {
  "apikey": "sb_publishable_58cpfNAhuugIZHYRTXQeoQ_CTpHe7hr",
  "Authorization": "Bearer sb_publishable_58cpfNAhuugIZHYRTXQeoQ_CTpHe7hr"
};

async function test() {
  console.log("Tentando selecionar id, observacao de egg_lots...");
  try {
    const res = await fetch(url, { headers });
    const json = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", json);
  } catch (e) {
    console.error("error:", e);
  }
}

test();
