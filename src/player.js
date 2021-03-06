/**
 * player.js
 */

game.createPlayerCanvas = function(armor) {
    armor = typeof armor !== 'undefined' ? armor : null;

    var canvas = me.video.createCanvas(160, 288);
    var context = canvas.getContext('2d');
    var body = me.save.body;

    if (armor === null) {
        if (body.gender === "m") {
            context.drawImage(me.loader.getImage("m_body"), 0, 0);
        } else {
            context.drawImage(me.loader.getImage("f_body"), 0, 0);
        }
    } else {
        context.drawImage(me.loader.getImage(armor + "_nohead"), 0, 0);
    }
    
    var name;
    if (body.color === null) {
        name = body.gender + "_" + body.hair;
    } else {
        name = body.gender + "_" + body.hair + "_" + body.color;
    }
    context.drawImage(me.loader.getImage(name), 0, 0);
    
    return canvas;
};

game.Player = me.ObjectEntity.extend({
    shadow: null,
    //attacks
    attacking: false,
    attack_box: null,
    attack_cooldown: 500,
    attack_cooldown_run: null,
    belt_cooldown: 200,
    belt_cooldown_run: null,
    weapon: null,
    red_screen: null,
    target_box: null,
    use_box: null,
    use_box_timer: null,
    flipped: false,
    hp_font: null,
    backpack_icon: null,
    dying: false,
    //efects
    magic_find: null,
    hp_text: null,
    init_v: null,
    init: function(x, y) {
        this.init_v = true;
        settings = {};
        settings.spritewidth = 32;
        settings.spriteheight = 32;
        settings.image = game.createPlayerCanvas();

        this.parent(x, y, settings);


        me.game.viewport.follow(this.pos, me.game.viewport.AXIS_BOTH);
        this.renderable.addAnimation("right", [5, 6, 7, 8], 300);
        this.renderable.addAnimation("up", [20, 21, 22, 23], 300);
        this.renderable.addAnimation("down", [35, 36, 37, 38], 300);
        this.renderable.addAnimation("iddle_right", [10, 11], 600);
        this.renderable.addAnimation("iddle_up", [25, 26], 600);
        this.renderable.addAnimation("iddle_down", [40, 41], 600);
        this.renderable.addAnimation("attack_down", [30, 31, 32, 33, 34], 1);
        this.renderable.addAnimation("attack_up", [15, 16, 17, 18, 19], 1);
        this.renderable.addAnimation("attack_right", [0, 1, 2, 3, 4], 1);

        this.setVelocity(1.7, 1.7);
        this.gravity = 0;
        this.updateColRect(10, 12, 17, 10);
        this.renderable.setCurrentAnimation("iddle_down");

        this.attack_cooldown_run = 0;

        //store GUID
        if (me.save.player === 0) {
            me.save.add({player : this.GUID});
        } else {
            me.save.player = this.GUID;
        }
        game.instances.player = this;
        this.type = "player";

        //creating shadow and GUI
        this.shadow = new game.Shadow(this.pos.x + 8, this.pos.y + 13);
        me.game.add(this.shadow, 4);
        this.target_box = new game.CollisionBox(this.pos.x + 8, this.pos.y + 22, "human_target");
        me.game.add(this.target_box, 4);
        this.backpack_icon = new game.BackpackIcon(0, game.screenHeight - 16);
        me.game.add(this.backpack_icon, game.guiLayer);


        this.hp_font = game.fonts.bad_red;
        this.red_screen = null;

        //armor & weapon
        this.equipArmor();
        this.equipWeapon();

        //efects
        this.magic_find = 0;

        game.mechanic.updateStats();

        //INSTANCES
        game.instances.exp_bar = new game.gui.StatsBar(game.screenWidth - 100, game.screenHeight - 20);
        me.game.add(game.instances.exp_bar, game.LAYERS.GUI);
        me.event.publish("/player/exp", [me.save.exp]);
        me.event.publish("/player/mana", [me.save.mana]);

        game.instances.belt = new game.gui.Belt();
        me.game.add(game.instances.belt, game.guiLayer);

        this.hp_text = new game.gui.SmallText(this.pos.x + 5, this.posy + this.renderable.height, me.save.hp + "/" + me.save.maxhp, this.hp_font);
        me.game.add(this.hp_text, game.LAYERS.GUI - 1);
        this.belt_cooldown_run = new Array(8);
        for (var i = 0; i < this.belt_cooldown_run.length; i++) {
            this.belt_cooldown_run[i] = 0;
        }

        if (typeof me.game.currentLevel.level_name !== "undefined") {
            var message = new game.gui.BigText(me.game.currentLevel.level_name);
            me.game.add(message, game.guiLayer);
        }

    },
    update: function() {
        if (this.dying) {
            me.game.remove(this);
            var dieText = me.entityPool.newInstanceOf("BigText", "YOU HAVE DIED\nAND YOU LOSE ALL YOUR MONEY\nPRES C TO RESPAWN");
            var deathSmoke = me.entityPool.newInstanceOf("DeathSmoke", this.pos.x + (this.renderable.width / 2), this.pos.y + (this.renderable.height / 2));
            me.game.add(deathSmoke);
            me.game.add(dieText, game.guiLayer);
            var respawn_entity = new game.entities.Respawn(this.pos.x, this.pos.y);
            me.game.add(respawn_entity);
        }

        if (me.input.isKeyPressed("debug")) {
            me.debug.renderHitBox = !me.debug.renderHitBox;
            me.debug.renderVelocity = !me.debug.renderVelocity;
        }

        if (me.input.isKeyPressed("mana")) {
            game.mechanic.trigger_manabook();
        }

        if (me.input.isKeyPressed("esc")) {
            game.mechanic.trigger_options();
        }
        
        if(me.input.isKeyPressed("inventory")){
            game.mechanic.trigger_backpack();
        }

        //BeltKeys
        if (me.input.isKeyPressed("belt1")) {
            game.mechanic.belt_use(0);
        } else if (me.input.isKeyPressed("belt2")) {
            game.mechanic.belt_use(1);
        } else if (me.input.isKeyPressed("belt3")) {
            game.mechanic.belt_use(2);
        } else if (me.input.isKeyPressed("belt4")) {
            game.mechanic.belt_use(3);
        } else if (me.input.isKeyPressed("belt5")) {
            game.mechanic.belt_use(4);
        } else if (me.input.isKeyPressed("belt6")) {
            game.mechanic.belt_use(5);
        } else if (me.input.isKeyPressed("belt7")) {
            game.mechanic.belt_use(6);
        } else if (me.input.isKeyPressed("belt8")) {
            game.mechanic.belt_use(7);
        }

        if ((me.save.hp <= (me.save.maxhp * 0.05)) && this.red_screen === null) {
            this.red_screen = new game.effects.RedScreen();
            me.game.add(this.red_screen, game.guiLayer - 1);
        } else if ((me.save.hp >= (me.save.maxhp * 0.05)) && this.red_screen !== null) {
            me.game.remove(this.red_screen);
            this.red_screen = null;
        }

        // TODO:CHANGE
        //me.game.HUD.setItemValue("HP", me.save.hp);
        if (this.use_box !== null) {
            if (me.timer.getTime() > (this.use_box_timer + 200)) {
                this.destroyUse();
            }
        }

        if (this.attacking) {
            if (this.renderable.getCurrentAnimationFrame() === 4) {
                if (this.renderable.isCurrentAnimation("attack_up")) {
                    this.renderable.setCurrentAnimation("iddle_up");
                } else if (this.renderable.isCurrentAnimation("attack_down")) {
                    this.renderable.setCurrentAnimation("iddle_down");
                } else if (this.renderable.isCurrentAnimation("attack_right")) {
                    this.renderable.setCurrentAnimation("iddle_right");
                }

                if (this.attack_box !== null) {
                    me.game.remove(this.attack_box);
                }
            }
            if (me.timer.getTime() > (this.attack_cooldown_run + this.attack_cooldown)) {
                this.attacking = false;

            }
        }

        if (me.input.isKeyPressed('attack') && this.attacking === false) {
            this.attack_cooldown_run = me.timer.getTime();
            this.vel.x = 0;
            this.vel.y = 0;
            this.attacking = true;
            game.instances.audio.channels.effects.addEffect("swing");
            if ((this.renderable.isCurrentAnimation("up") === true) || (this.renderable.isCurrentAnimation("iddle_up") === true)) {
                this.renderable.setCurrentAnimation("attack_up");
                this.createAttack("up");
            } else if ((this.renderable.isCurrentAnimation("down") === true) || (this.renderable.isCurrentAnimation("iddle_down") === true)) {
                this.renderable.setCurrentAnimation("attack_down");
                this.createAttack("down");
            } else if ((this.renderable.isCurrentAnimation("right") === true) || (this.renderable.isCurrentAnimation("iddle_right") === true)) {
                this.renderable.setCurrentAnimation("attack_right");
                this.createAttack("right");
            }
        } else {
            if (this.attacking === false) {
                if (me.input.isKeyPressed('left')) {
                    // flip the sprite on horizontal axis
                    this.renderable.setCurrentAnimation("right");
                    this.renderable.flipX(true);
                    this.flipped = true;
                    // update the entity velocity
                    this.vel.x -= this.accel.x * me.timer.tick;
                    this.vel.y = 0;
                } else if (me.input.isKeyPressed('right')) {
                    this.renderable.setCurrentAnimation("right");
                    // unflip the sprite
                    this.renderable.flipX(false);
                    this.flipped = false;
                    // update the entity velocity
                    this.vel.x += this.accel.x * me.timer.tick;
                    this.vel.y = 0;
                } else if (me.input.isKeyPressed('up')) {
                    this.renderable.setCurrentAnimation("up");
                    // update the entity velocity
                    this.renderable.flipX(false);
                    this.flipped = false;
                    this.vel.y -= this.accel.y * me.timer.tick;
                    this.vel.x = 0;
                } else if (me.input.isKeyPressed('down')) {
                    this.renderable.setCurrentAnimation("down");
                    // unflip the sprite
                    this.renderable.flipX(false);
                    this.flipped = false;
                    // update the entity velocity
                    this.vel.y += this.accel.y * me.timer.tick;
                    this.vel.x = 0;
                } else {
                    //i need to handle use carefully
                    if (game.instances.dialog === null) {
                        if (me.input.isKeyPressed('use')) {
                            this.createUse();
                        }
                    }
                    this.vel.x = 0;
                    this.vel.y = 0;
                    if (this.renderable.isCurrentAnimation('right')) {
                        this.renderable.setCurrentAnimation('iddle_right');
                    } else if (this.renderable.isCurrentAnimation('up')) {
                        this.renderable.setCurrentAnimation('iddle_up');
                    } else if (this.renderable.isCurrentAnimation('down')) {
                        this.renderable.setCurrentAnimation('iddle_down');
                    }
                }
            }
        }


        var res = me.game.collide(this, true);
        if (res.length >= 1) {
            for (var i = 0; i < res.length; i++) {
                //this is quite horrible solution
                if ((res[i].obj.type === "npc") || (res[i].obj.type === me.game.ENEMY_OBJECT) || (res[i].obj.type === "solid_object")) {
                    if (res[i].x !== 0) {
                        // x axis
                        if (res[i].x < 0) {
                            this.pos.x = this.pos.x + this.accel.x;

                        } else {
                            this.pos.x = this.pos.x - this.accel.y;
                        }
                    }
                    else {
                        // y axis
                        if (res[i].y < 0) {
                            this.pos.y = this.pos.y + this.accel.x;

                        } else {
                            this.pos.y = this.pos.y - this.accel.y;
                        }
                    }
                }
            }
        }

        // check & update player movement
        this.updateMovement();
        this.shadow.pos.x = this.pos.x + 8;
        this.shadow.pos.y = this.pos.y + 13;
        this.updateTargetBox();
        this.hp_text.pos.x = this.pos.x + 5;
        this.hp_text.pos.y = this.pos.y + this.renderable.height;
        this.hp_text.text = me.save.hp + "/" + me.save.maxhp;
        if (this.weapon !== null) {
            var weapon = game.mechanic.get_inventory_item(me.save.equip.weapon);
            if (weapon === false) {
                //should not be required, in other case this will fix it
                this.equipWeapon();
            } else {
                this.weapon.pos.x = this.pos.x + weapon.attributes.offset_x;
                this.weapon.pos.y = this.pos.y + weapon.attributes.offset_y;
                this.syncWeapon();
            }
        }
        // update object animation
        this.parent();
        return true;
    },
    onDestroyEvent: function() {
        me.game.remove(this.shadow);
        this.shadow = null;
        me.game.remove(this.target_box);
        this.target_box = null;
        me.game.remove(this.hp_text);
        this.hp_text = null;

        game.instances.player = null;
    },
    updateHP: function(value) {
        if (value > 0) {
            var text = new game.effects.HealText(this.pos.x, this.pos.y, value + "HP");
            me.game.add(text, game.LAYERS.GUI - 1);
        }
        if ((me.save.hp + value) > me.save.maxhp) {
            me.save.hp = me.save.maxhp;
        } else {
            me.save.hp = me.save.hp + value;
        }
    },
    updateEXP: function(value) {
        if (me.save.exp + value >= me.save.next_level) {
            //NEXT LEVEL
            this.levelUp(value);
        } else {
            me.save.exp = me.save.exp + value;
            me.event.publish("/player/exp", [me.save.exp]);
        }
    },
    levelUp: function(value) {
        var addition = me.save.exp + value - me.save.next_level;
        me.save.level = me.save.level + 1;
        me.save.exp = addition;
        var next_level = Math.floor((me.save.next_level) + me.save.next_level * 2.5);
        me.save.next_level = next_level;
        me.save.skill = me.save.skill + 5;
        game.instances.audio.channels.effects.addEffect("level_up");
        var bigText = me.entityPool.newInstanceOf("BigText", "YOU HAVE REACHED LEVEL " + me.save.level);
        me.game.add(bigText, game.guiLayer);
        game.instances.console.post("You haved reached new level");
        game.mechanic.updateStats();
        me.event.publish("/player/exp", [me.save.exp]);
    },
    createAttack: function(direction) {
        if (direction === "up") {
            //top
            this.attack_box = new game.CollisionBox(this.pos.x + 10, this.pos.y - 16 + 8, "human_attack");
        } else if (direction === "down") {//down
            this.attack_box = new game.CollisionBox(this.pos.x + 8, this.pos.y + 22 + 2, "human_attack");
        } else if (direction === "right") {//right
            if (this.renderable.lastflipX) {
                this.attack_box = new game.CollisionBox(this.pos.x + 10 - 16, this.pos.y + 8, "human_attack");
            } else {
                this.attack_box = new game.CollisionBox(this.pos.x + 10 + 12, this.pos.y + 8, "human_attack");
            }
        }
        me.game.add(this.attack_box, 4);        

    },
    destroyAttack: function() {
        me.game.remove(this.attack_box);
        this.attack_box = null;
        this.use_box_timer = null;
    }, 
    destroyUse: function() {
        me.game.remove(this.use_box);
        this.use_box = null;
    }, 
    updateTargetBox: function() {
        if ((this.renderable.isCurrentAnimation("up") === true) || (this.renderable.isCurrentAnimation("iddle_up") === true)) {
            this.target_box.pos.x = this.pos.x + 10;
            this.target_box.pos.y = this.pos.y - 16 + 8;
        } else if ((this.renderable.isCurrentAnimation("down") === true) || (this.renderable.isCurrentAnimation("iddle_down") === true)) {
            this.target_box.pos.x = this.pos.x + 8;
            this.target_box.pos.y = this.pos.y + 22 + 2;
        } else if ((this.renderable.isCurrentAnimation("right") === true) || (this.renderable.isCurrentAnimation("iddle_right") === true)) {
            if (this.renderable.lastflipX) {
                this.target_box.pos.x = this.pos.x + 10 - 16;
                this.target_box.pos.y = this.pos.y + 8;
            } else {
                this.target_box.pos.x = this.pos.x + 10 + 12;
                this.target_box.pos.y = this.pos.y + 8;
            }
        }
    }, 
    createUse: function() {
        if (this.use_box === null) {
            this.use_box = me.entityPool.newInstanceOf("CollisionBox", this.target_box.pos.x, this.target_box.pos.y, "human_use");
            this.use_box_timer = me.timer.getTime();
            me.game.add(this.use_box, 5);
        }
    }, 
    hurt: function(dmg_min, dmg_max, dmg_type) {
        var dmg = game.mechanic.player_hurt(dmg_min, dmg_max, dmg_type);
        this.updateHP(-dmg);
        this.hit_text = me.entityPool.newInstanceOf("HitText", this.pos.x + (this.renderable.width / 2), this.pos.y + (this.renderable.height / 2), dmg, game.fonts.bad_red);
        me.game.add(this.hit_text, this.z + 1);
        me.game.sort();
        if (me.save.hp <= 0) {
            //just die already!)
            this.dying = true;
        } else {
            this.renderable.flicker(2);
        }
    }, 
    equipWeapon: function() {
        if (this.weapon !== null) {
            me.game.remove(this.weapon);
            this.weapon = null;
        }
        if (me.save.equip.weapon !== null) {
            var weapon = game.mechanic.get_inventory_item(me.save.equip.weapon);
            if (weapon === false) {
                console.log("weapon not found in inventory");
                me.save.equip.weapon = null;
                return false;
            }
            this.weapon = new game.weapons[weapon.attributes.object_name](this.pos.x + weapon.attributes.offset_x, this.pos.y + weapon.attributes.offset_y);
            me.game.add(this.weapon, this.z + 1);
            game.mechanic.updateStats();
            return true;
        }
    }, 
    equipArmor: function() {
        if (me.save.equip.armor === null) {
            this.renderable.image = game.createPlayerCanvas();
        } else {
            var armor = game.mechanic.get_inventory_item(me.save.equip.armor);
            if (armor === false) {
                console.log("armor not found in inventory");
                me.save.equip.armor = null;
                return false;
            }
            this.renderable.image = game.createPlayerCanvas(armor.attributes.image_name);
        }
        game.mechanic.updateStats();
        return true;
    }, 
    syncWeapon: function() {
        if (this.renderable.isCurrentAnimation("up")) {
            this.weapon.renderable.flipX(false);
            this.weapon.renderable.setCurrentAnimation("up");
            this.weapon.z = this.z - 1;
        } else if (this.renderable.isCurrentAnimation("iddle_up")) {
            this.weapon.renderable.flipX(false);
            this.weapon.renderable.setCurrentAnimation("iddle_up");
            this.weapon.z = this.z - 1;
        } else if (this.renderable.isCurrentAnimation("down")) {
            this.weapon.renderable.flipX(false);
            this.weapon.renderable.setCurrentAnimation("down");
            this.weapon.z = this.z + 1;
        } else if (this.renderable.isCurrentAnimation("iddle_down")) {
            this.weapon.renderable.flipX(false);
            this.weapon.renderable.setCurrentAnimation("iddle_down");
            this.weapon.z = this.z + 1;
        } else if (this.renderable.isCurrentAnimation("right")) {
            if (this.flipped) {
                this.weapon.renderable.flipX(true);
            } else {
                this.weapon.renderable.flipX(false);
            }
            this.weapon.renderable.setCurrentAnimation("right");
            this.weapon.z = this.z + 1;
        } else if (this.renderable.isCurrentAnimation("iddle_right")) {
            if (this.flipped) {
                this.weapon.renderable.flipX(true);
            } else {
                this.weapon.renderable.flipX(false);
            }
            this.weapon.renderable.setCurrentAnimation("iddle_right");
            this.weapon.z = this.z + 1;
        } else if (this.renderable.isCurrentAnimation("attack_down")) {
            this.weapon.renderable.flipX(false);
            this.weapon.renderable.setCurrentAnimation("attack_down");
            this.weapon.z = this.z + 1;
        } else if (this.renderable.isCurrentAnimation("attack_right")) {
            if (this.flipped) {
                this.weapon.renderable.flipX(true);
            } else {
                this.weapon.renderable.flipX(false);
            }
            this.weapon.renderable.setCurrentAnimation("attack_right");
            this.weapon.z = this.z + 1;
        } else if (this.renderable.isCurrentAnimation("attack_up")) {
            this.weapon.renderable.flipX(false);
            this.weapon.renderable.setCurrentAnimation("attack_up");
            this.weapon.z = this.z - 1;
        }
    },
    getDirection: function(){
        if(this.renderable.isCurrentAnimation("right") || this.renderable.isCurrentAnimation("iddle_right") || this.renderable.isCurrentAnimation("attack_right")){
            if(this.flipped){
                return "left";
            } else {
                return "right";
            }
        } else if(this.renderable.isCurrentAnimation("up") || this.renderable.isCurrentAnimation("iddle_up") || this.renderable.isCurrentAnimation("attack_up")){
            return "up";
        } else {
            return "down";
        }
    }        
});
