import React, {useRef, useState, useCallback} from 'react';
import {
  StyleSheet,
  ScrollView,
  Dimensions,
  ImageBackground,
  TouchableHighlight,
  PanResponder,
  Animated,
} from 'react-native';
import {View, Button, Text} from 'react-native-ui-lib';
import {Divider, FAB, IconButton} from 'react-native-paper';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons';
import {useFocusEffect} from '@react-navigation/native';

import firestore from '@react-native-firebase/firestore';

import Entypo from 'react-native-vector-icons/Entypo';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAppDispatch, useAppSelector} from '../../redux/reduxHooks';
import {setTempUser, setLoading} from '../../redux/features/globalSlice';

import CustomTabnav from '../../components/CustomTabnav';
import {Colors} from '../../styles';
import CustomStamp from '../../components/CustomStamp';
import Loader from '../../components/Loader';

const defaultImage = require('../../assets/images/empty.jpg');

const {width, height} = Dimensions.get('window');
const threshold = width * 0.1;

enum Relation {
  initial,
  like,
  dislike,
  favorite,
}

var index = 0;
var targetUsers_alt: Array<any>;

const UserShopSearch = ({navigation, route}: any) => {
  const dispatch = useAppDispatch();

  const users = firestore().collection('Users');
  const relations = firestore().collection('Relations');
  const settings = firestore().collection('Settings');
  const profiles = firestore().collection('Profiles');

  const tempUser = useAppSelector((state: any) => state.global.tempUser);
  const isLoading = useAppSelector((state: any) => state.global.isLoading);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [targetUsers, setTargetUsers] = useState<Array<any>>([]);

  const [state, setState] = useState<Relation>(Relation.initial);
  const pan = useRef(new Animated.ValueXY()).current;
  const favoriteValue = Animated.multiply(
    pan.x.interpolate({
      inputRange: [
        -width,
        -threshold,
        -(threshold - 1),
        0,
        threshold - 1,
        threshold,
        width,
      ],
      outputRange: [0, 0, 1, 1, 1, 0, 0],
    }),
    pan.y,
  );

  const [direction, setDirection] = useState<1 | -1>(1);

  targetUsers_alt = targetUsers;
  index = currentIndex;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        if (gestureState.y0 > height * 0.5) {
          setDirection(-1);
        } else {
          setDirection(1);
        }
      },
      onPanResponderMove: Animated.event([null, {dx: pan.x, dy: pan.y}], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gestureState) => {
        console.log(gestureState.dx, width * 0.3);
        if (
          Math.abs(gestureState.dx) < width * 0.3 &&
          gestureState.dy > width * -0.3
        ) {
          Animated.spring(pan, {
            toValue: {
              x: 0,
              y: 0,
            },
            useNativeDriver: false,
          }).start();
          return;
        }
        Animated.spring(pan, {
          toValue: {
            x:
              gestureState.dx === 0
                ? 0
                : width * (gestureState.dx / Math.abs(gestureState.dx)),
            y: 0,
          },
          useNativeDriver: false,
        }).start(({finished}) => {
          if (finished) {
          }
        });

        console.log('release: ', currentIndex);

        index++;
        Animated.timing(pan, {
          toValue: {
            x: 0,
            y: 0,
          },
          useNativeDriver: false,
          duration: 0,
        }).start();
        if (gestureState.dx >= width * 0.3) {
          console.log(index);
          handleRelation(Relation.like)();
        } else if (gestureState.dx <= width * -0.3) {
          handleRelation(Relation.dislike)();
        } else if (gestureState.dy <= width * -0.3)
          handleRelation(Relation.favorite)();
        else setCurrentIndex(index);
      },
    }),
  ).current;

  useFocusEffect(
    useCallback(() => {
      users
        .where('role', '!=', tempUser.role)
        .get()
        .then(async querySnapshot => {
          const users = await Promise.all(
            querySnapshot.docs.map(async doc => {
              const profile = await profiles.doc(doc.id).get();
              const setting = await settings.doc(doc.id).get();

              let bio = '',
                priceRange = {low: 1500, high: 10000};

              if (profile.exists) {
                let data = profile.data();
                if (data !== undefined) {
                  bio = data.bio;
                }
              }

              if (setting.exists) {
                let data = setting.data();
                if (data !== undefined) {
                  priceRange = data.priceRange;
                }
              }

              return {
                id: doc.id,
                name: doc.data().name,
                avatar: doc.data().avatar,
                bio,
                low: priceRange.low,
                hight: priceRange.high,
              };
            }),
          );

          setTargetUsers(users);
          dispatch(setLoading(false));
        });

      return () => {
        index = 0;
      };
    }, []),
  );

  const getTargetUserFromIndex = async (users: Array<any>, index: number) => {
    let bio = '',
      priceRange = {low: 1500, high: 10000};

    const profile = await profiles.doc(users[index].id).get();
    const setting = await settings.doc(users[index].id).get();

    if (profile.exists) {
      let data = profile.data();
      if (data !== undefined) {
        bio = data.bio;
      }
    }

    if (setting.exists) {
      let data = setting.data();
      if (data !== undefined) {
        priceRange = data.priceRange;
      }
    }

    return {
      id: users[index].id,
      name: users[index].data().name,
      avatar: users[index].data().avatar,
      bio,
      low: priceRange.low,
      high: priceRange.high,
    };
  };

  const handleFilter = async (filterName: Relation) => {
    dispatch(setLoading(true));

    const querySnapshot = await users.where('role', '!=', tempUser.role).get();
    console.log('out', querySnapshot.size);
    if (querySnapshot.size) {
      console.log('in', querySnapshot.size);
      const users = querySnapshot.docs;
      console.log(tempUser.id, filterName);
      console.log(users);
      const relationQuerySnapshot1 = await relations
        .where('user1', '==', tempUser.id)
        .where('relation1', '==', filterName)
        .get();
      const relationQuerySnapshot2 = await relations
        .where('user2', '==', tempUser.id)
        .where('relation2', '==', filterName)
        .get();

      let resultUsers = [];
      console.log('relation1 size: ', relationQuerySnapshot1.docs);
      console.log('relation2 size: ', relationQuerySnapshot2.docs);
      for (let i = 0; i < relationQuerySnapshot1.size; i++) {
        let index = users.findIndex(
          user => user.id === relationQuerySnapshot1.docs[i].data().user2,
        );

        if (index > -1) {
          let newUser = await getTargetUserFromIndex(users, index);
          resultUsers.push(newUser);
        }
      }

      for (let i = 0; i < relationQuerySnapshot2.size; i++) {
        let index = users.findIndex(
          user => user.id === relationQuerySnapshot2.docs[i].data().user1,
        );

        if (index > -1) {
          let newUser = await getTargetUserFromIndex(users, index);
          resultUsers.push(newUser);
        }
      }
      console.log(resultUsers);
      setTargetUsers(resultUsers);
    }

    dispatch(setLoading(false));
  };

  const handleRelation = (relation: Relation) => () => {
    console.log('relation: ', relation);
    console.log('current index: ', index - 1);
    console.log('target users: ', targetUsers_alt);
    const targetUser = targetUsers_alt[index - 1];
    console.log(tempUser, targetUser);

    relations
      .where('user1', 'in', [tempUser.id, targetUser.id])
      .get()
      .then(querySnapshot => {
        const results = querySnapshot.docs.filter(doc => {
          if (
            doc.data().user2 === tempUser.id ||
            doc.data().user2 === targetUser.id
          ) {
            return true;
          } else {
            return false;
          }
        });
        if (results.length == 1) {
          const doc = results[0];
          const docId = doc.id;
          const whichRelation =
            tempUser.id === doc.data().user1 ? 'relation1' : 'relation2';
          relations
            .doc(docId)
            .update({
              [whichRelation]: relation,
            })
            .then(() => console.log('Updated'));
        } else {
          if (results.length > 0) {
            console.log(
              'Database error: more than two documents exist between two users in one direction!',
            );
          } else {
            relations
              .add({
                user1: tempUser.id,
                relation1: relation,
                user2: targetUser.id,
                relation2: Relation.initial,
              })
              .then(() => console.log('Added'));
          }
        }
      });
    if (index < targetUsers_alt.length) {
      setCurrentIndex(index);
    } else {
      index = 0;
      setCurrentIndex(0);
    }
  };

  // console.log(targetUsers_alt);
  return (
    <CustomTabnav
      navigation={navigation}
      route={route}
      handleFilter={handleFilter}
    >
      <Loader isLoading={isLoading} />
      {(currentIndex + 2 > targetUsers.length && targetUsers.length
        ? [targetUsers[currentIndex], targetUsers[0]]
        : targetUsers.slice(currentIndex, currentIndex + 2)
      )
        .reverse()
        .map((user, key) => {
          if (key === 1) {
            return (
              <Animated.View
                key={key}
                style={{
                  ...styles.animated_view,
                  transform: [
                    {
                      translateX: pan.x,
                    },
                    {
                      translateY: pan.y,
                    },
                    {
                      rotateZ: pan.x.interpolate({
                        inputRange: [-width, 0, width],
                        outputRange:
                          direction === 1
                            ? ['-10deg', '0deg', '10deg']
                            : ['10deg', '0deg', '-10deg'],
                      }),
                    },
                  ],
                }}
                {...panResponder.panHandlers}
              >
                <TouchableHighlight
                  onPress={() =>
                    navigation.navigate('UserShopDetail', {
                      ...user,
                    })
                  }
                >
                  <ImageBackground
                    source={
                      user.avatar === 'default.png'
                        ? defaultImage
                        : {
                            uri: user.avatar,
                          }
                    }
                    style={styles.imagebackground}
                    imageStyle={styles.image}
                  >
                    <CustomStamp
                      text={'like'}
                      style={{
                        ...styles.like_stamp,
                        opacity: pan.x.interpolate({
                          inputRange: [-width, 0, width],
                          outputRange: [0, 0, 3],
                        }),
                      }}
                      text_style={styles.like_text}
                    />
                    <CustomStamp
                      text={'dislike'}
                      style={{
                        ...styles.dislike_stamp,
                        opacity: pan.x.interpolate({
                          inputRange: [-width, 0, width],
                          outputRange: [3, 0, 0],
                        }),
                      }}
                      text_style={styles.dislike_text}
                    />

                    <CustomStamp
                      text={'favorite'}
                      style={{
                        ...styles.favorite_stamp,
                        opacity: favoriteValue.interpolate({
                          inputRange: [-width, 0, width],
                          outputRange: [3, 0, 0],
                        }),
                      }}
                      text_style={styles.favorite_text}
                    />

                    <View bottom style={styles.container}>
                      <View style={styles.desc}>
                        <Text style={styles.title}>{user.name}</Text>
                        <View row spread>
                          <SimpleLineIcons
                            name="location-pin"
                            size={20}
                            color={Colors.redBtn}
                          />
                          <Text style={styles.label}>池袋</Text>
                          <View style={{width: width * 0.2}}></View>
                          <MaterialCommunityIcons
                            name="piggy-bank-outline"
                            size={20}
                            color={Colors.redBtn}
                          />
                          <Text style={styles.label}>{user.low}円〜</Text>
                        </View>
                        <Divider style={styles.divider} />
                        <Text>{user.bio}</Text>
                      </View>
                    </View>
                  </ImageBackground>
                </TouchableHighlight>
              </Animated.View>
            );
          } else if (key === 0) {
            return (
              <Animated.View
                key={key}
                style={{
                  ...styles.animated_view,
                  transform: [
                    {
                      scaleX: pan.x.interpolate({
                        inputRange: [
                          -width,
                          -width * 0.3,
                          0,
                          width * 0.3,
                          width,
                        ],
                        outputRange: [1, 1, 0.9, 1, 1],
                      }),
                    },
                    {
                      scaleY: pan.x.interpolate({
                        inputRange: [
                          -width,
                          -width * 0.3,
                          0,
                          width * 0.3,
                          width,
                        ],
                        outputRange: [1, 1, 0.9, 1, 1],
                      }),
                    },
                  ],
                }}
                {...panResponder.panHandlers}
              >
                <ImageBackground
                  source={
                    user.avatar === 'default.png'
                      ? defaultImage
                      : {
                          uri: user.avatar,
                        }
                  }
                  style={styles.imagebackground}
                  imageStyle={styles.image}
                >
                  <View bottom style={styles.container}>
                    <View style={styles.desc}>
                      <Text style={styles.title}>{user.name}</Text>
                      <View row spread>
                        <SimpleLineIcons
                          name="location-pin"
                          size={20}
                          color={Colors.redBtn}
                        />
                        <Text style={styles.label}>池袋</Text>
                        <View style={{width: width * 0.2}}></View>
                        <MaterialCommunityIcons
                          name="piggy-bank-outline"
                          size={20}
                          color={Colors.redBtn}
                        />
                        <Text style={styles.label}>{user.low}円〜</Text>
                      </View>
                      <Divider style={styles.divider} />
                      <Text>{user.bio}</Text>
                    </View>
                  </View>
                </ImageBackground>
              </Animated.View>
            );
          }
        })}
      <IconButton
        icon="undo"
        color={Colors.white}
        style={styles.return}
        size={15}
        onPress={handleRelation(Relation.like)}
      />
      <IconButton
        icon="times"
        color={Colors.white}
        style={styles.dislike}
        size={20}
        onPress={handleRelation(Relation.dislike)}
      />
      <IconButton
        icon="star"
        color={Colors.white}
        style={styles.favorite}
        size={15}
        onPress={handleRelation(Relation.favorite)}
      />
      <IconButton
        icon="heart"
        color={Colors.white}
        style={styles.like}
        size={20}
        onPress={handleRelation(Relation.like)}
      />
      <IconButton
        icon="bolt"
        color={Colors.white}
        style={styles.boost}
        size={15}
        onPress={handleRelation(Relation.like)}
      />
    </CustomTabnav>
  );
};

const styles = StyleSheet.create({
  imagebackground: {
    width: width,
    height: height,
  },
  image: {
    width,
    height: height * 0.6,
  },
  container: {
    height: '100%',
    width,
  },
  desc: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
    paddingBottom: 0,
    height: height * 0.45,
  },
  title: {
    height: 50,
    fontSize: 30,
  },
  label: {
    color: Colors.iconLabel,
    marginLeft: 10,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.iconLabel,
    marginVertical: 10,
  },
  reaction_icon: {
    position: 'absolute',
    bottom: height * 0.5 - width * 0.25,
    right: width * 0.25,
    zIndex: 1,
  },
  return: {
    position: 'absolute',
    left: (width * 1) / 6 - 20,
    bottom: 25,
    backgroundColor: '#a4a9ad',
    width: 40,
    height: 40,
    borderRadius: 50,
  },
  dislike: {
    position: 'absolute',
    left: (width * 2) / 6 - 25,
    bottom: 20,
    backgroundColor: '#20a39e',
    width: 50,
    height: 50,
    borderRadius: 50,
  },
  favorite: {
    position: 'absolute',
    left: (width * 3) / 6 - 20,
    bottom: 25,
    backgroundColor: '#ffba49',
    width: 40,
    height: 40,
    borderRadius: 50,
  },
  like: {
    position: 'absolute',
    left: (width * 4) / 6 - 25,
    backgroundColor: '#fe3c72',
    bottom: 20,
    width: 50,
    height: 50,
    borderRadius: 50,
  },
  boost: {
    position: 'absolute',
    left: (width * 5) / 6 - 20,
    backgroundColor: '#b780ff',
    bottom: 25,
    width: 40,
    height: 40,
    borderRadius: 50,
  },
  animated_view: {
    position: 'absolute',
  },
  box: {
    height: 250,
    width: 150,
    borderRadius: 5,
  },
  alt_box: {
    height: 250,
    width: 150,
    borderRadius: 5,
  },
  nope: {
    color: 'white',
    size: 10,
  },
  like_stamp: {
    borderColor: Colors.like,
    position: 'absolute',
    top: width * 0.2,
    left: width * 0.2,
    padding: 5,
    transform: [
      {
        rotateZ: '-20deg',
      },
    ],
  },
  like_text: {
    fontSize: 30,
    color: Colors.like,
    fontWeight: 'bold',
  },
  dislike_stamp: {
    borderColor: Colors.dislike,
    position: 'absolute',
    top: width * 0.2,
    right: width * 0.1,
    padding: 5,
    transform: [
      {
        rotateZ: '20deg',
      },
    ],
  },
  dislike_text: {
    fontSize: 30,
    color: Colors.dislike,
    fontWeight: 'bold',
  },
  favorite_stamp: {
    borderColor: Colors.favorite,
    position: 'absolute',
    bottom: height * 0.5,
    left: width * 0.3,
    padding: 5,
    zIndex: 2,
  },
  favorite_text: {
    fontSize: 30,
    color: Colors.favorite,
    fontWeight: 'bold',
  },
});

export default UserShopSearch;
