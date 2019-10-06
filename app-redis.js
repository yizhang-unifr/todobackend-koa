const router = require('koa-router')();

const Koa = require('koa');
const Redis = require('ioredis');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const uuidv4 = require('uuid/v4');

const app = new Koa();
var redis_config = {
  host: "127.0.0.1",
  port: 6379,
  db: 1
};

const redis = new Redis(redis_config);

router
  // todos endpoints
  .get('/todos/', todosList)
  .del('/todos/', todosClear)
  .post('/todos/', todoAdd)
  .get('todo', '/todos/:id', todoShow)
  .patch('/todos/:id', todoUpdate)
  .del('/todos/:id', todoRemove)
  // tags endpoints
  .get('/tags/', tagsList)
  .del('/tags/', tagsClear)
  .post('/tags/', tagAdd)
  .get('tag', '/tags/:id', tagShow)
  .patch('/tags/:id', tagUpdate)
  .del('/tags/:id', tagRemove)

  // todostags endpoints
  .get('todo', '/todos/:id/tags/', todosTagsList)
  .post('/todos/:id/tags/', todosTagAssociate)
  .del('/todos/:id/tags/', todosTagClear)
  .del('/todos/:todos_id/tags/:tag_id', todosTagRemove)
  // tagstodos endpoints
  .get('/tags/:id/todos/', tagsTodosList)
  ;

/*
  ** Models
  */

const TodoModel = function () { }

// parser flatten array into obj. (used for hash or set, but not with string)
TodoModel.prototype.streamParser = function (stream) {
  let res = {};
  res['id'] = stream[0];
  let keys = stream[1].filter((e, i) => i % 2 == 0);
  let values = stream[1].filter((e, i) => i % 2 == 1);
  let content = {};
  keys.forEach((element, index) => {
    content[element] = values[index];
  });
  Object.assign(res, content);
  return res;
}

// load obj and transfer it to flatten array as arg. for xadd, hset, zset (but not useful for string)
TodoModel.prototype.objectLoader = function (obj) {
  // if obj is a array of objs, return also an Array of flatten array
  let _objLoader = function (ele) {
    let keys = Object.keys(ele);
    let res = [];
    keys.forEach((key) => {
      res.push(key);
      res.push(ele[key])
    });
    return res;
  };
  if (Array.isArray(obj)) {
    return obj.map((ele) => _objLoader(ele))
  } else {
    return _objLoader(obj);
  };
}

TodoModel.prototype.findAll = async function () {
  let keys = await redis.keys('todos*');
  let array_res = [];
  if (keys.length > 0) {
    for (key of keys) {
      let _obj = null;
      await redis.get(key).then(function (result) {
        _obj = result;
        array_res.push(JSON.parse(_obj));
      });
    }
  }
  console.log(array_res);
  return array_res;
}

TodoModel.prototype.clearAll = async function () {

  let keys = await redis.keys('todos*');
  let _res = 0;
  for (let key of keys) {
    await redis.del(key, function (err, success) {
      // @TODO: using transaction or pipeline?
      if (err) console.log("[ERROR] TodoModel.clearAll ", err);
      _res = success; // if success should return interger 1.
      if (_res) {
        console.log('[Success] TodoModel.clearAll todos:(', key, ') deleted.')
      }
    });
  }
}


TodoModel.prototype.saveOne = async function (uuid, content) {
  let _res = false;
  redis.set('todos:' + uuid, content, function (err, success) {
    if (err)
      console.log("[ERROR] TodoModel.saveOne ", err);
    if (success) {
      console.log('[Success] TodoModel.saveOne todos:(', success, ') saved.');
      _res = success; // return OK 
    }
    return _res;
  });
}

TodoModel.prototype.showOne = async function (uuid) {
  let json_str = await redis.get('todos:' + uuid);
  return json_str;
}

TodoModel.prototype.delOne = async function (uuid) {
  let _res = await redis.del('todos:' + uuid)
  if (_res) {
    console.log("Success] TodoModel.delOne (", uuid, ") deleted.")
  }
}

TodoModel.prototype.associateOneTag = async function (uuid, new_tag_content) { // tag_content is JSON-obj
  let todo = JSON.parse(await todos.showOne(uuid));
  var todo_tags = todo['tags'];
  console.log(await todo_tags);
  todo_tags.push(new_tag_content);
  let todo_str = JSON.stringify(todo);
  return await todos.saveOne(uuid, todo_str);
}


/*
** TagModel
*/
const TagModel = function () { }

// parser flatten array into obj. (used for hash or set, but not with string)
TagModel.prototype.streamParser = function (stream) {
  let res = {};
  res['id'] = stream[0];
  let keys = stream[1].filter((e, i) => i % 2 == 0);
  let values = stream[1].filter((e, i) => i % 2 == 1);
  let content = {};
  keys.forEach((element, index) => {
    content[element] = values[index];
  });
  Object.assign(res, content);
  return res;
}

// load obj and transfer it to flatten array as arg. for xadd, hset, zset (but not useful for string)
TagModel.prototype.objectLoader = function (obj) {
  // if obj is a array of objs, return also an Array of flatten array
  let _objLoader = function (ele) {
    let keys = Object.keys(ele);
    let res = [];
    keys.forEach((key) => {
      res.push(key);
      res.push(ele[key])
    });
    return res;
  };
  if (Array.isArray(obj)) {
    return obj.map((ele) => _objLoader(ele))
  } else {
    return _objLoader(obj);
  };
}

TagModel.prototype.findAll = async function () {
  let keys = await redis.keys('tags*');
  let array_res = [];
  if (keys.length > 0) {
    for (key of keys) {
      let _obj = null;
      await redis.get(key).then(function (result) {
        _obj = result;
        array_res.push(JSON.parse(_obj));
      });
    }
  }
  console.log(array_res);
  return array_res;
}

TagModel.prototype.clearAll = async function () {

  let keys = await redis.keys('tags*');
  let _res = 0;
  for (let key of keys) {
    await redis.del(key, function (err, success) {
      // @TODO: using transaction or pipeline?
      if (err) console.log("[ERROR] TagModel.clearAll ", err);
      _res = success; // if success should return interger 1.
      if (_res) {
        console.log('[Success] TagModel.clearAll tags:(', key, ') deleted.')
      }
    });
  }
}


TagModel.prototype.saveOne = async function (uuid, content) {
  let _res = false;
  redis.set('tags:' + uuid, content, function (err, success) {
    if (err)
      console.log("[ERROR] TagModel.saveOne ", err);
    if (success) {
      console.log('[Success] TagModel.saveOne tag:(', uuid, ') saved.');
      _res = success; // return OK 
    }
    return _res;
  });
}

TagModel.prototype.showOne = async function (uuid) {
  let json_str = await redis.get('tags:' + uuid);
  return json_str;
}

TagModel.prototype.delOne = async function (uuid) {
  let _res = await redis.del('tags:' + uuid)
  if (_res) {
    console.log("[Success] TagModel.delOne (", uuid, ") deleted.")
  }
}

TagModel.prototype.associateOneTodo = async function (uuid, new_todo_content) {
  let tag = JSON.parse(await tags.showOne(uuid));
  let tag_todos = tag['todos'];
  tag_todos.push(new_todo_content);

  let tag_str = JSON.stringify(tag);
  return await tags.saveOne(uuid, tag_str);
}


const todos = new TodoModel();
const tags = new TagModel();




// Controllers
// Todos
async function todosList(ctx) {
  //console.log(ctx); 
  res = await todos.findAll();
  return ctx.body = res;
}

async function todosClear(ctx) {
  await todos.clearAll();
  ctx.status = 204;
}

async function todoAdd(ctx) {
  let uuid = uuidv4();
  const todo = ctx.request.body;
  if (!todo['title']) ctx.throw(400, { 'error': '"title" is a required field' });
  const title = todo['title'];
  if (!typeof title === 'string' || !title.length) ctx.throw(400, { 'error': '"title" must be a string with at least one character' });
  todo['id'] = uuid;
  todo['completed'] = todo['completed'] || false;
  todo['tags'] = todo['tags'] || [];
  todo['url'] = 'http://' + ctx.host + router.url('todo', uuid)

  let content = JSON.stringify(todo);
  let _res = todos.saveOne(uuid, content);
  if (!_res) {
    ctx.throw(400, { 'error': 'adding todo failed' })
  }
  ctx.status = 201;
  ctx.body = todo;
  ctx.set('Location', todo['url']);;
}

async function todoShow(ctx) {
  const id = ctx.params.id;
  const todo = await todos.showOne(id);
  if (!todo) ctx.throw(404, { 'error': 'Todo not found' });
  todo.id = id;
  ctx.body = JSON.parse(todo);
}

async function todoUpdate(ctx) {
  const id = ctx.params.id;
  let todo = await todos.showOne(id);
  todo = JSON.parse(todo);
  Object.assign(todo, ctx.request.body);
  todo_json_str = JSON.stringify(todo);
  await todos.saveOne(id, todo_json_str);

  ctx.status = 201;
  ctx.body = todo;
}

async function todoRemove(ctx) {
  const id = ctx.params.id;
  await todos.delOne(id);
  ctx.status = 204;
}

async function tagsList(ctx) {
  //console.log(ctx); 
  res = await tags.findAll();
  return ctx.body = res;
}

async function tagsClear(ctx) {
  await tags.clearAll();
  ctx.status = 204;
}

async function tagAdd(ctx) {
  let uuid = uuidv4();
  let tag = ctx.request.body;
  if (!tag['title']) ctx.throw(400, { 'error': '"title" is a required field' });
  const title = tag['title'];
  if (!typeof title === 'string' || !title.length) ctx.throw(400, { 'error': '"title" must be a string with at least one character' });
  tag['id'] = uuid;
  tag['todos'] = tag['todos'] || [];
  tag['url'] = 'http://' + ctx.host + router.url('tag', uuid)

  let content = JSON.stringify(tag);
  let _res = tags.saveOne(uuid, content);
  if (!_res) {
    ctx.throw(400, { 'error': 'adding todo failed' })
  }
  ctx.status = 201;
  ctx.body = tag;
  ctx.set('Location', tag['url']);;
}

async function tagShow(ctx) {
  const id = ctx.params.id;
  const tag = await tags.showOne(id);
  if (!tag) ctx.throw(404, { 'error': 'Todo not found' });
  tag.id = id;
  ctx.body = JSON.parse(tag);

}

async function tagUpdate(ctx) {
  const id = ctx.params.id;
  let tag = await tags.showOne(id);
  tag = JSON.parse(tag);
  Object.assign(tag, ctx.request.body);
  tag_json_str = JSON.stringify(tag);
  await tags.saveOne(id, tag_json_str);

  ctx.status = 201;
  ctx.body = tag;

}

async function tagRemove(ctx) {

  const id = ctx.params.id;
  await tags.delOne(id);
  ctx.status = 204
}


async function todosTagsList(ctx) {
  const id = ctx.params.id;
  let todo = JSON.parse(await todos.showOne(id));
  if (!todo) ctx.throw(404, { 'error': 'Todo not found' });
  let _res = [];
  for (const tag of todo['tags']) {
    let tag_obj = await tags.showOne(tag['id']);
    tag_obj = JSON.parse(tag_obj);
    _res.push(tag_obj);
  }

  ctx.body = _res;

}

async function todosTagRemove(ctx) {

  const todos_id = ctx.params.todos_id;
  const tag_id = ctx.params.tag_id;
  let todo = JSON.parse(await todos.showOne(todos_id));
  if (!todo) ctx.throw(404, { 'error': 'Todos not found' });
  let old_tags = todo['tags'];
  if (!old_tags) ctx.throw(404, { 'error': 'Tag not found' });
  let new_tags = old_tags.filter(tag => tag['id'] != tag_id);
  todo['tags'] = [];
  Object.assign(todo['tags'], new_tags);
  todo = JSON.stringify(todo);
  await todos.saveOne(todos_id, todo);
  ctx.body = todo;

}

async function todosTagAssociate(ctx) {
  const id = ctx.params.id;
  let todo = await todos.showOne(id);
  if (!todo) ctx.throw(404, { 'error': 'Todo not found' });
  let tag = ctx.request.body;
  tag = await JSON.parse(await tags.showOne([tag['id']]));
  if (!tag) ctx.throw(404, { 'error': 'Tag not found' });
  await todos.associateOneTag(id, tag)
  await tags.associateOneTodo(tag['id'], JSON.parse(todo));
  ctx.body = todo
}

async function todosTagClear(ctx) {
  const id = ctx.params.id;
  let todo = await todos.showOne(id);
  if (!todo) ctx.throw(404, { 'error': 'Todo not found' });
  todo = JSON.parse(todo);

  todo['tags'] = [];
  todo = JSON.stringify(todo);
  await todos.saveOne(id, todo);
  ctx.body = todo;
}

async function tagsTodosList(ctx) {
  const id = ctx.params.id;
  let tag = JSON.parse(await tags.showOne(id));
  let tags_todos = tag['todos'];

  let todos_ids = [];
  for (const todo of tags_todos) {
    let todo_obj = JSON.parse(await todos.showOne(todo['id']));
    todos_ids.push(todo_obj);
  }
  ctx.body = todos_ids;
}


app
  .use(bodyParser())
  .use(cors())
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(8080);
