game.ItemObject = Object.extend({
    guid: null,
    name: null,
    icon_name: null,
    type: null,
    attributes: null,
    tooltip_text: null,
    rarity: null,
    init: function(name, icon_name, type, rarity, attributes, tooltip, guid) {
        guid = typeof guid !== 'undefined' ? guid : game.mechanic.guid();
        this.guid = guid;
        this.name = name;
        this.icon_name = icon_name;
        this.type = type;               //weapon, armor, artefact, consumable, others, spells
        this.rarity = rarity;
        this.attributes = attributes;   //Hash
        this.tooltip_text = tooltip;
    }
});

game.consumables.Layout = game.ShadowObject.extend({
    tooltip: null,
    autopick: null,
    rarity: null,
    name: null,
    target_box: null,
    life_timer: null,
    init: function(x, y, settings, autopick, name, rarity) {
        this.parent(x, y, settings);
        this.renderable.addAnimation("always", [0, 1, 2, 3, 4]);
        this.renderable.setCurrentAnimation("always");
        this.tooltip = null;
        this.collidable = true;
        this.autopick = autopick;
        this.name = name;
        this.rarity = rarity;
        this.life_timer = me.timer.getTime();
    }, update: function() {
        //This didn't work as intended
        /*if (me.timer.getTime() > (this.life_timer + 60000)) {
            me.game.remove(this);
        }*/

        var res = me.game.collide(this, true);
        var targeted = false;
        if (res.length >= 1) {
            for (var i = 0; i < res.length; i++) {
                //this is quite horrible solution
                if (res[i].obj.type === "human_target") {
                    targeted = true;
                } else if (res[i].obj.type === "human_use") {
                    game.instances.player.destroyUse();
                    this.onUse();
                } else if (res[i].obj.type === "player" && this.autopick) {
                    this.onUse();
                }
            }
        }

        if (me.input.isKeyPressed("alt")) {
            targeted = true;
        }

        if (targeted) {
            this.showTooltip();
            this.showTargetBox();
        } else {
            this.destroyTooltip();
            this.destroyTargetBox();
        }

        this.parent();
        return true;
    },
    showTooltip: function() {
        if (this.tooltip === null) {
            this.tooltip = new game.DropTooltip(this.pos.x - (this.renderable.width / 2), this.pos.y - 5, this.name, this.rarity);
            me.game.add(this.tooltip, game.guiLayer - 1);
        }
    },
    destroyTooltip: function() {
        if (this.tooltip !== null) {
            me.game.remove(this.tooltip);
            this.tooltip = null;
        }
    },
    showTargetBox: function() {
        if (this.target_box === null) {
            this.target_box = new game.Target(this.pos.x, this.pos.y + 5, "green");
            me.game.add(this.target_box, this.z - 1);
        }
    },
    destroyTargetBox: function() {
        if (this.target_box !== null) {
            me.game.remove(this.target_box);
            this.target_box = null;
        }
    },
    onUse: function() {
    },
    onPickup: function(item) {
        if (item.type === "spell") {
            if(game.mechanic.inventory_push(item, "spells")){
                game.instances.audio.channels.effects.addEffect(item.attributes.sound);
                me.game.remove(this);
                this.collidable = false;
            } else {
                console.log("Not enough room in Mana Book");
            }
        } else {
            if (game.mechanic.inventory_push(item, "inventory")) {
                game.instances.audio.channels.effects.addEffect(item.attributes.sound);
                me.game.remove(this);
                this.collidable = false;
            } else {
                console.log("Not enough room in inventory");
            }
        }
    },
    onDestroyEvent: function() {
        this.destroyTooltip();
        this.destroyTargetBox();
        this.parent();
    }
});

game.consumables.HealthPotion = game.consumables.Layout.extend({
    tooltip: null,
    init: function(x, y) {
        settings = {};
        settings.spritewidth = 16;
        settings.spriteheight = 16;
        settings.image = "item-flask-red";
        this.parent(x, y, settings, false, "Health Potion", "normal");
    },
    onUse: function() {
        var tooltip_text = [];
        tooltip_text.push(new game.gui.TextLine("Health Potion", game.fonts.bad_red));
        tooltip_text.push(new game.gui.TextLine("Heals 30 HP", game.fonts.bad_red));
        var item = new game.ItemObject("Health Potion", "item-flask-red", "consumable", "normal", {heal: 30, sound: "bottle"}, tooltip_text);

        this.onPickup(item);
    }
});

game.consumables.Burger = game.consumables.Layout.extend({
    shadow: null,
    smile: null,
    init: function(x, y) {
        settings = {};
        settings.spritewidth = 16;
        settings.spriteheight = 16;
        settings.image = "burger";
        this.parent(x, y, settings, true, "Health", "normal");
    },
    onUse: function() {
        game.instances.audio.channels.effects.addEffect("itempick2");
        game.instances.player.updateHP(30);
        me.game.remove(this);
    }
});

game.consumables.Money = game.consumables.Layout.extend({
    value: null,
    init: function(x, y, value) {
        this.value = value;
        settings = {};
        settings.spritewidth = 16;
        settings.spriteheight = 16;
        if (value < 6) {
            settings.image = "money-1";
        } else if (value < 26) {
            settings.image = "money-2";
        } else if (value < 101) {
            settings.image = "money-3";
        } else {
            settings.image = "money-4";
        }

        this.parent(x, y, settings, true, this.value + " Gold", "gold");
    },
    onUse: function() {
        game.instances.audio.channels.effects.addEffect("coins");
        me.save.money = me.save.money + this.value;
        me.game.remove(this);
        this.collidable = false;
    }
});


game.items.Equip = game.consumables.Layout.extend({
    item: null,
    init: function(x, y, item) {
        this.item = item;
        settings = {};
        settings.spritewidth = 16;
        settings.spriteheight = 16;
        settings.image = this.item.icon_name;
        this.parent(x, y, settings, false, item.name, item.rarity);
    },
    onUse: function() {
        this.onPickup(this.item);
    }
});