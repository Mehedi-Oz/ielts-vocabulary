// Database Helper Functions

async function loadWords() {
  let allData = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await db
      .from('vocabulary')
      .select('*')
      .order('added_on', { ascending: false })
      .range(from, from + pageSize - 1);
    
    if (error) { console.error(error); return allData; }
    if (!data || data.length === 0) break;
    
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  
  return allData;
}

async function loadUnread() {
  const { data, error } = await db
    .from('vocabulary')
    .select('*')
    .eq('read', false)
    .order('added_on', { ascending: true });
  if (error) { console.error(error); return []; }
  return data;
}

async function markRead(id) {
  const { error } = await db
    .from('vocabulary')
    .update({ read: true })
    .eq('id', id);
  if (error) console.error(error);
}

async function addWord(word, definition, example, topic, difficulty) {
  const { data, error } = await db
    .from('vocabulary')
    .insert([{ word, definition, example, topic, difficulty }])
    .select();
  if (error) console.error(error);
  return data;
}

async function toggleBookmark(id, currentState) {
  const { error } = await db
    .from('vocabulary')
    .update({ bookmarked: !currentState })
    .eq('id', id);
  if (error) console.error(error);
}

async function deleteWord(id) {
  const { error } = await db
    .from('vocabulary')
    .delete()
    .eq('id', id);
  if (error) console.error(error);
}

async function getStats() {
  const { count: total } = await db
    .from('vocabulary')
    .select('*', { count: 'exact', head: true });

  const { count: read } = await db
    .from('vocabulary')
    .select('*', { count: 'exact', head: true })
    .eq('read', true);

  return { total, read, remaining: total - read };
}
